<?php

use App\Enums\PaymentStatus;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Support\Stripe\StripeGateway;
use Laravel\Sanctum\Sanctum;

function mockPaymentIntent(string $id = 'pi_test_123', string $secret = 'pi_test_123_secret'): void
{
    test()->mock(StripeGateway::class, function ($mock) use ($id, $secret): void {
        $mock->shouldReceive('createPaymentIntent')
            ->once()
            ->andReturn(['id' => $id, 'client_secret' => $secret, 'status' => 'requires_payment_method']);
    });
}

it('creates a pending order with server totals and a payment intent', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 2])->assertOk();

    mockPaymentIntent();

    $response = $this->postJson('/api/v1/checkout', [
        ...checkoutAddress(),
        // Tampered amounts and product data must be ignored (FR-ORDER-2).
        'subtotal' => 1,
        'grand_total' => 1,
        'items' => [['product_id' => $product->id, 'unit_price' => 1, 'quantity' => 99]],
    ], ['Idempotency-Key' => 'checkout-1'])->assertCreated();

    $response->assertJsonPath('data.order.status', 'pending')
        ->assertJsonPath('data.order.subtotal', 10000)
        ->assertJsonPath('data.order.grand_total', 10000)
        ->assertJsonPath('data.order.items.0.quantity', 2)
        ->assertJsonPath('data.order.items.0.unit_price', 5000)
        ->assertJsonPath('data.payment.client_secret', 'pi_test_123_secret');

    expect($response->json('data.order.order_number'))->toMatch('/^ORD-\d{4}-\d{6}$/');

    $order = Order::query()->firstOrFail();
    expect($order->user_id)->toBe($customer->id)
        ->and($order->items()->count())->toBe(1)
        ->and($order->items()->first()->product_name)->toBe($product->name)
        ->and($order->items()->first()->product_image)->toBeNull()
        ->and($order->statusHistories()->count())->toBe(1);

    $payment = Payment::query()->firstOrFail();
    expect($payment->order_id)->toBe($order->id)
        ->and($payment->provider_payment_intent_id)->toBe('pi_test_123')
        ->and($payment->amount)->toBe(10000)
        ->and($payment->status)->toBe(PaymentStatus::RequiresPaymentMethod);

    expect(Cart::query()->firstOrFail()->items()->count())->toBe(0);
});

it('reuses the order for the same idempotency key', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();

    mockPaymentIntent();

    $first = $this->postJson('/api/v1/checkout', checkoutAddress(), ['Idempotency-Key' => 'same-key'])->assertCreated();
    $second = $this->postJson('/api/v1/checkout', checkoutAddress(), ['Idempotency-Key' => 'same-key'])->assertOk();

    expect($second->json('data.order.id'))->toBe($first->json('data.order.id'))
        ->and(Order::query()->count())->toBe(1);
});

it('rejects checkout when the cart is empty', function (): void {
    Sanctum::actingAs(User::factory()->create(), ['customer']);

    $this->postJson('/api/v1/checkout', checkoutAddress())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cart');
});

it('rejects checkout when stock fell below the cart quantity', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 5]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 3])->assertOk();

    $product->forceFill(['stock' => 1])->save();

    $this->postJson('/api/v1/checkout', checkoutAddress())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cart');

    expect(Order::query()->count())->toBe(0);
});

it('rejects checkout when a cart product was deactivated', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 5]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();

    $product->forceFill(['is_active' => false])->save();

    $this->postJson('/api/v1/checkout', checkoutAddress())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cart');
});

it('revalidates the coupon at checkout and rejects it when expired', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 9000, 'stock' => 5]);
    Coupon::factory()->create(['code' => 'SOON', 'expires_at' => now()->addHour()]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    $this->postJson('/api/v1/cart/coupon', ['code' => 'SOON'])->assertOk();

    $this->travel(2)->hours();

    $this->postJson('/api/v1/checkout', checkoutAddress())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('coupon_code');

    expect(Order::query()->count())->toBe(0);
});

it('accepts a coupon code supplied at checkout', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 9000, 'stock' => 5]);
    Coupon::factory()->create(['code' => 'TAKE500', 'type' => 'fixed', 'value' => 500]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();

    mockPaymentIntent();

    $this->postJson('/api/v1/checkout', checkoutAddress(['coupon_code' => 'TAKE500']))
        ->assertCreated()
        ->assertJsonPath('data.order.discount_total', 500)
        ->assertJsonPath('data.order.grand_total', 9499)
        ->assertJsonPath('data.order.coupon_code', 'TAKE500');
});

it('requires an authenticated customer for checkout', function (): void {
    $product = Product::factory()->create(['price' => 5000, 'stock' => 5]);

    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();

    $this->postJson('/api/v1/checkout', checkoutAddress())->assertUnauthorized();
    expect(Order::query()->count())->toBe(0);
});

it('scopes an idempotency key to the authenticated customer', function (): void {
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);
    $first = User::factory()->create();
    $second = User::factory()->create();

    Sanctum::actingAs($first, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    mockPaymentIntent();
    $firstOrder = $this->postJson('/api/v1/checkout', checkoutAddress(), ['Idempotency-Key' => 'shared-key'])
        ->assertCreated();

    forgetAuthGuards();

    Sanctum::actingAs($second, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    mockPaymentIntent('pi_test_456', 'pi_test_456_secret');
    $secondOrder = $this->postJson('/api/v1/checkout', checkoutAddress(), ['Idempotency-Key' => 'shared-key'])
        ->assertCreated();

    expect($secondOrder->json('data.order.id'))->not->toBe($firstOrder->json('data.order.id'))
        ->and(Order::query()->count())->toBe(2)
        ->and(Order::query()->where('user_id', $second->id)->count())->toBe(1);
});

it('does not decrement stock before payment succeeds', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 3])->assertOk();
    mockPaymentIntent();

    $this->postJson('/api/v1/checkout', checkoutAddress())->assertCreated();

    // Stock moves only when the signed webhook confirms payment (FR-ORDER-8).
    expect($product->fresh()->stock)->toBe(10);
});

it('rejects staff tokens on the checkout endpoint', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create(), ['staff']);

    $this->postJson('/api/v1/checkout', checkoutAddress())->assertForbidden();
});
