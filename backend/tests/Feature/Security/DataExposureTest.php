<?php

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Stripe\StripeGateway;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakeStripeGateway;

/*
|--------------------------------------------------------------------------
| SEC-5, SEC-6, SEC-7: disclosure, mass assignment, IDOR
|--------------------------------------------------------------------------
*/

/**
 * @param  list<string>  $forbidden
 */
function assertNoSensitiveKeys(mixed $value, array $forbidden): void
{
    if (! is_array($value)) {
        return;
    }

    foreach ($value as $key => $child) {
        expect(in_array(mb_strtolower((string) $key), $forbidden, true))
            ->toBeFalse("Sensitive key leaked: {$key}");

        assertNoSensitiveKeys($child, $forbidden);
    }
}

it('never exposes credentials or Stripe secrets in API responses', function (): void {
    $forbidden = [
        'password',
        'password_hash',
        'remember_token',
        'client_secret',
        'secret',
        'stripe_secret',
        'stripe_key',
        'api_key',
        'provider_payment_intent_id',
    ];

    $customer = User::factory()->create();
    $order = makeOrderFor($customer, OrderStatus::Paid);

    Sanctum::actingAs($customer, ['customer']);

    assertNoSensitiveKeys($this->getJson('/api/v1/auth/me')->assertOk()->json(), $forbidden);
    assertNoSensitiveKeys(
        $this->getJson("/api/v1/orders/{$order->id}")->assertOk()->json(),
        $forbidden,
    );

    forgetAuthGuards();
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    assertNoSensitiveKeys(
        $this->getJson("/api/v1/admin/orders/{$order->id}")->assertOk()->json(),
        $forbidden,
    );
    assertNoSensitiveKeys($this->getJson('/api/v1/admin/staff')->assertOk()->json(), $forbidden);
    assertNoSensitiveKeys($this->getJson('/api/v1/admin/profile')->assertOk()->json(), $forbidden);
});

it('ignores privileged fields on public registration and profile updates', function (): void {
    $registered = $this->postJson('/api/v1/auth/register', [
        'name' => 'Mallory',
        'email' => 'mallory@example.test',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
        // None of these may be mass-assigned.
        'type' => 'staff',
        'is_active' => false,
        'roles' => ['Super Admin'],
        'permissions' => ['roles.manage'],
        'email_verified_at' => now()->toIso8601String(),
    ])->assertCreated();

    $user = User::query()->where('email', 'mallory@example.test')->firstOrFail();

    expect($registered->json('data.user.type'))->toBe('customer')
        ->and($user->type)->toBe(UserType::Customer)
        ->and($user->is_active)->toBeTrue()
        ->and($user->email_verified_at)->toBeNull()
        ->and($user->getRoleNames()->all())->toBe([]);

    forgetAuthGuards();

    $staff = User::factory()->staff()->create();

    Sanctum::actingAs($staff, ['staff']);

    $this->patchJson('/api/v1/admin/profile', [
        'name' => 'Still Staff',
        'type' => 'customer',
        'roles' => ['Super Admin'],
        'permissions' => ['roles.manage'],
    ])->assertOk();

    expect($staff->fresh()->type)->toBe(UserType::Staff)
        ->and($staff->fresh()->getRoleNames()->all())->toBe([])
        ->and($staff->fresh()->can('roles.manage'))->toBeFalse();
});

it('ignores client-submitted ownership, status and totals at checkout', function (): void {
    $customer = User::factory()->create();
    $other = User::factory()->create();
    $product = Product::factory()->create(['price' => 4000, 'stock' => 5]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 2])->assertOk();
    $this->instance(StripeGateway::class, new FakeStripeGateway);

    $response = $this->postJson('/api/v1/checkout', checkoutAddress([
        'user_id' => $other->id,
        'customer_email' => $other->email,
        'status' => 'paid',
        'grand_total' => 1,
        'paid_at' => now()->toIso8601String(),
    ]))->assertCreated();

    $response->assertJsonPath('data.order.status', 'pending')
        ->assertJsonPath('data.order.grand_total', 8999)
        ->assertJsonPath('data.order.customer_email', $customer->email);

    $order = Order::query()->findOrFail($response->json('data.order.id'));

    expect($order->user_id)->toBe($customer->id)
        ->and($order->status)->toBe(OrderStatus::Pending)
        ->and($order->grand_total)->toBe(8999);
});
