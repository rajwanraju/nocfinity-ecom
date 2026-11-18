<?php

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Support\Stripe\StripeGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakeStripeGateway;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test case / Pest bootstrap
|--------------------------------------------------------------------------
|
| Feature tests boot the full Laravel application. Unit tests stay plain.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/**
 * Sanctum's guard caches the resolved user for the lifetime of the test
 * application. Real HTTP requests get a fresh application each time, so tests
 * that switch tokens must explicitly forget the guard.
 */
function forgetAuthGuards(): void
{
    app('auth')->forgetGuards();
}

/**
 * Seeds are the caller's responsibility; this only builds and authenticates
 * a Super Admin staff token for RBAC-protected admin endpoints.
 */
function actingAsSuperAdmin(): User
{
    $user = User::factory()->staff()->create();
    $user->assignRole(User::SUPER_ADMIN_ROLE);

    Sanctum::actingAs($user, ['staff']);

    return $user;
}

/**
 * Shared checkout payload for order/webhook tests.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function checkoutAddress(array $overrides = []): array
{
    return [
        'shipping_name' => 'Ada Lovelace',
        'shipping_phone' => '+1 555 010 2030',
        'shipping_line1' => '144 Prince Street',
        'shipping_line2' => 'Apt 4B',
        'shipping_city' => 'New York',
        'shipping_state' => 'NY',
        'shipping_postal_code' => '10012',
        'shipping_country' => 'US',
        'notes' => 'Leave at the door.',
        ...$overrides,
    ];
}

/**
 * Adds a product (and optional coupon) to the authenticated customer's cart,
 * checks out with a fake Stripe gateway and returns [order, fake, number].
 *
 * @return array{0: Order, 1: FakeStripeGateway, 2: string}
 */
function placeOrderWithFakeStripe(
    User $customer,
    Product $product,
    int $quantity = 1,
    ?Coupon $coupon = null,
): array {
    Sanctum::actingAs($customer, ['customer']);

    $stripe = new FakeStripeGateway;
    test()->instance(StripeGateway::class, $stripe);

    test()->postJson('/api/v1/cart/items', [
        'product_id' => $product->id,
        'quantity' => $quantity,
    ])->assertOk();

    if ($coupon instanceof Coupon) {
        test()->postJson('/api/v1/cart/coupon', ['code' => $coupon->code])->assertOk();
    }

    $checkout = test()->postJson('/api/v1/checkout', checkoutAddress())
        ->assertCreated();

    $order = Order::query()->findOrFail($checkout->json('data.order.id'));

    return [$order, $stripe, (string) $checkout->json('data.order.order_number')];
}

/**
 * @param  array<string, mixed>  $object
 * @return array<string, mixed>
 */
function stripeEventPayload(string $type, array $object, string $eventId = 'evt_test_1'): array
{
    return [
        'id' => $eventId,
        'object' => 'event',
        'type' => $type,
        'data' => ['object' => $object],
    ];
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function paymentIntentPayload(Order $order, array $overrides = []): array
{
    $payment = Payment::query()->where('order_id', $order->id)->firstOrFail();

    return [
        'id' => $payment->provider_payment_intent_id,
        'object' => 'payment_intent',
        'amount' => $order->grand_total,
        'currency' => 'usd',
        'status' => 'succeeded',
        'latest_charge' => 'ch_test_123',
        'metadata' => [
            'order_id' => (string) $order->id,
            'order_number' => $order->order_number,
        ],
        ...$overrides,
    ];
}

/**
 * @param  array<string, mixed>  $event
 */
function sendStripeWebhook(array $event, string $signature = 'test_signature'): TestResponse
{
    return test()->call(
        'POST',
        '/api/v1/webhooks/stripe',
        [],
        [],
        [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $signature,
        ],
        json_encode($event, JSON_THROW_ON_ERROR),
    );
}
