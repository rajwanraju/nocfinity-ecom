<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Product;
use App\Models\StripeWebhookEvent;
use App\Models\User;
use App\Notifications\OrderStatusChanged;
use App\Support\Stripe\StripeGateway;
use Illuminate\Support\Facades\Notification;
use Tests\Support\FakeStripeGateway;

beforeEach(function (): void {
    $this->instance(StripeGateway::class, new FakeStripeGateway);
});

it('marks a paid order, decrements stock and records coupon usage', function (): void {
    Notification::fake();

    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);
    $coupon = Coupon::factory()->create(['code' => 'TEN', 'type' => 'percentage', 'value' => 10]);

    [$order] = placeOrderWithFakeStripe($customer, $product, 2, $coupon);

    sendStripeWebhook(stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order)))
        ->assertOk()
        ->assertJsonPath('data.received', true);

    $order->refresh();
    $product->refresh();

    expect($order->status)->toBe(OrderStatus::Paid)
        ->and($order->paid_at)->not->toBeNull()
        ->and($product->stock)->toBe(8)
        ->and($order->latestPayment?->status)->toBe(PaymentStatus::Succeeded)
        ->and($order->latestPayment?->provider_charge_id)->toBe('ch_test_123')
        ->and($order->statusHistories()->count())->toBe(2)
        ->and($coupon->fresh()->used_count)->toBe(1)
        ->and(CouponUsage::query()->where('order_id', $order->id)->count())->toBe(1);

    Notification::assertSentTo($customer, OrderStatusChanged::class);
});

it('processes a duplicate webhook only once', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$order] = placeOrderWithFakeStripe($customer, $product, 2);
    $event = stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order));

    sendStripeWebhook($event)->assertOk();
    sendStripeWebhook($event)->assertOk();

    expect(StripeWebhookEvent::query()->count())->toBe(1)
        ->and($product->fresh()->stock)->toBe(8)
        ->and($order->fresh()->statusHistories()->count())->toBe(2);
});

it('rejects a webhook with an invalid signature', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$order, $stripe] = placeOrderWithFakeStripe($customer, $product, 1);
    $stripe->verify = false;

    sendStripeWebhook(stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order)))
        ->assertStatus(400)
        ->assertJsonPath('success', false);

    expect(StripeWebhookEvent::query()->count())->toBe(0)
        ->and($order->fresh()->status)->toBe(OrderStatus::Pending)
        ->and($product->fresh()->stock)->toBe(10);
});

it('never marks an order paid on a failed payment', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    [$order] = placeOrderWithFakeStripe($customer, $product, 1);

    sendStripeWebhook(stripeEventPayload('payment_intent.payment_failed', paymentIntentPayload($order, [
        'status' => 'requires_payment_method',
        'last_payment_error' => ['message' => 'Your card was declined.'],
    ])))->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Pending)
        ->and($product->fresh()->stock)->toBe(10)
        ->and($order->fresh()->latestPayment?->status)->toBe(PaymentStatus::Failed)
        ->and($order->fresh()->latestPayment?->failure_message)->toBe('Your card was declined.');
});

it('refunds and cancels when stock is gone at payment time', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 5]);

    [$order, $stripe] = placeOrderWithFakeStripe($customer, $product, 2);

    $product->forceFill(['stock' => 1])->save();

    sendStripeWebhook(stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order)))
        ->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($product->fresh()->stock)->toBe(1)
        ->and($stripe->refunds)->toHaveCount(1)
        ->and($stripe->refunds[0]['amount'])->toBe($order->grand_total)
        ->and($order->fresh()->latestPayment?->status)->toBe(PaymentStatus::Refunded);
});

it('refunds and cancels when the paid amount is wrong', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 5000, 'stock' => 5]);

    [$order, $stripe] = placeOrderWithFakeStripe($customer, $product, 1);

    sendStripeWebhook(stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order, [
        'amount' => 100,
    ])))->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($stripe->refunds)->toHaveCount(1)
        ->and($product->fresh()->stock)->toBe(5);
});

it('refunds and cancels when the coupon expired before payment', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['price' => 9000, 'stock' => 5]);
    $coupon = Coupon::factory()->create(['code' => 'SOON', 'expires_at' => now()->addHour()]);

    [$order, $stripe] = placeOrderWithFakeStripe($customer, $product, 1, $coupon);

    $this->travel(2)->hours();

    sendStripeWebhook(stripeEventPayload('payment_intent.succeeded', paymentIntentPayload($order)))
        ->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($stripe->refunds)->toHaveCount(1)
        ->and($product->fresh()->stock)->toBe(5);
});

it('stores unknown event types without side effects', function (): void {
    $event = stripeEventPayload('customer.created', ['id' => 'cus_123'], 'evt_unknown');

    sendStripeWebhook($event)->assertOk();

    $record = StripeWebhookEvent::query()->firstOrFail();
    expect($record->stripe_event_id)->toBe('evt_unknown')
        ->and($record->processed_at)->not->toBeNull();
});
