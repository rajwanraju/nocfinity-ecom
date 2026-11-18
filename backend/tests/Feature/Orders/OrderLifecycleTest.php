<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Exceptions\InvalidOrderTransitionException;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderStatusChanged;
use App\Services\OrderService;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

it('lists and shows only the customer own orders', function (): void {
    $customer = User::factory()->create();
    $other = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$order] = placeOrderWithFakeStripe($customer, $product, 1);

    forgetAuthGuards();
    Sanctum::actingAs($other, ['customer']);

    $this->getJson('/api/v1/orders')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson("/api/v1/orders/{$order->id}")->assertNotFound();

    forgetAuthGuards();
    Sanctum::actingAs($customer, ['customer']);

    $this->getJson('/api/v1/orders')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.id', $order->id);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.order_number', $order->order_number)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonCount(1, 'data.items');
});

it('rejects an invalid status transition', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$order] = placeOrderWithFakeStripe($customer, $product, 1);

    expect(fn () => app(OrderService::class)->transition($order, OrderStatus::Delivered))
        ->toThrow(InvalidOrderTransitionException::class);

    expect($order->fresh()->status)->toBe(OrderStatus::Pending);
});

it('walks the paid order through processing, shipping and delivery', function (): void {
    Notification::fake();

    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);
    $admin = User::factory()->staff()->create();

    [$order] = placeOrderWithFakeStripe($customer, $product, 1);
    sendStripeWebhook(stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order)))->assertOk();

    $service = app(OrderService::class);
    $service->transition($order, OrderStatus::Processing, $admin, 'Packing');
    $service->transition($order, OrderStatus::Shipped, $admin, 'Handed to carrier');
    $service->transition($order, OrderStatus::Delivered, $admin, 'Delivered');

    expect($order->fresh()->status)->toBe(OrderStatus::Delivered)
        ->and($order->fresh()->statusHistories()->count())->toBe(5);

    Notification::assertSentTo($customer, OrderStatusChanged::class);
});

it('cancels a paid order and restores stock, coupon usage and the payment', function (): void {
    Notification::fake();

    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);
    $coupon = Coupon::factory()->create(['code' => 'TEN', 'type' => 'percentage', 'value' => 10]);
    $admin = User::factory()->staff()->create();

    [$order, $stripe] = placeOrderWithFakeStripe($customer, $product, 2, $coupon);
    sendStripeWebhook(stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order)))->assertOk();

    expect($product->fresh()->stock)->toBe(8)
        ->and($coupon->fresh()->used_count)->toBe(1);

    $cancelled = app(OrderService::class)->transition($order, OrderStatus::Cancelled, $admin, 'Customer request');

    expect($cancelled->status)->toBe(OrderStatus::Cancelled)
        ->and($cancelled->cancelled_at)->not->toBeNull()
        ->and($product->fresh()->stock)->toBe(10)
        ->and($coupon->fresh()->used_count)->toBe(0)
        ->and(CouponUsage::query()->where('order_id', $order->id)->count())->toBe(0)
        ->and($order->fresh()->latestPayment?->status)->toBe(PaymentStatus::Refunded)
        ->and($stripe->refunds)->toHaveCount(1);

    Notification::assertSentTo($customer, OrderStatusChanged::class);
});

it('cancels a pending order by cancelling its payment intent', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$order, $stripe] = placeOrderWithFakeStripe($customer, $product, 1);
    $payment = $order->latestPayment;

    app(OrderService::class)->transition($order, OrderStatus::Cancelled, null, 'Changed mind');

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($stripe->cancelled)->toBe([$payment->provider_payment_intent_id])
        ->and($stripe->refunds)->toBe([])
        ->and($product->fresh()->stock)->toBe(10)
        ->and($payment->fresh()->status)->toBe(PaymentStatus::Canceled);
});

it('expires stale pending orders but leaves recent ones alone', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$oldOrder] = placeOrderWithFakeStripe($customer, $product, 1);

    $this->travel(61)->minutes();

    $this->artisan('orders:expire-pending')->assertSuccessful();

    expect($oldOrder->fresh()->status)->toBe(OrderStatus::Cancelled);

    // A fresh checkout is still pending after the command runs.
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    $fresh = $this->postJson('/api/v1/checkout', checkoutAddress())->assertCreated();
    $freshOrder = Order::query()->findOrFail($fresh->json('data.order.id'));

    $this->artisan('orders:expire-pending')->assertSuccessful();

    expect($freshOrder->fresh()->status)->toBe(OrderStatus::Pending);
});

it('allocates sequential order numbers', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$first] = placeOrderWithFakeStripe($customer, $product, 1);

    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    $second = $this->postJson('/api/v1/checkout', checkoutAddress())->assertCreated();
    $secondOrder = Order::query()->findOrFail($second->json('data.order.id'));

    expect($first->order_number)->toMatch('/^ORD-\d{4}-000001$/')
        ->and($secondOrder->order_number)->toMatch('/^ORD-\d{4}-000002$/');
});
