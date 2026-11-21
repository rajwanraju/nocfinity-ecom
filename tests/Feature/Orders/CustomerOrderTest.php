<?php

use App\Enums\OrderStatus;
use App\Models\User;
use App\Support\Stripe\StripeGateway;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakeStripeGateway;

it('lists only the authenticated customer orders', function (): void {
    $customer = User::factory()->create();
    $other = User::factory()->create();

    $mine = makeOrderFor($customer, OrderStatus::Paid);
    makeOrderFor($other, OrderStatus::Paid);

    Sanctum::actingAs($customer, ['customer']);

    $response = $this->getJson('/api/v1/orders')->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.order_number'))->toBe($mine->order_number)
        ->and($response->json('meta.pagination.total'))->toBe(1);
});

it('shows an owned order with its items and payment status', function (): void {
    $customer = User::factory()->create();
    $order = makeOrderFor($customer, OrderStatus::Paid);

    Sanctum::actingAs($customer, ['customer']);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.order_number', $order->order_number)
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonPath('data.payment_status', 'succeeded')
        ->assertJsonPath('data.items.0.product_name', 'Test product');
});

it('returns 404 for another customer order', function (): void {
    $customer = User::factory()->create();
    $order = makeOrderFor(User::factory()->create(), OrderStatus::Paid);

    Sanctum::actingAs($customer, ['customer']);

    $this->getJson("/api/v1/orders/{$order->id}")->assertNotFound();
    $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertNotFound();
});

it('cancels a pending order and releases its payment intent', function (): void {
    $customer = User::factory()->create();
    $order = makeOrderFor($customer, OrderStatus::Pending);
    $stripe = new FakeStripeGateway;
    $this->instance(StripeGateway::class, $stripe);

    Sanctum::actingAs($customer, ['customer']);

    $this->postJson("/api/v1/orders/{$order->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($order->fresh()->cancelled_at)->not->toBeNull()
        ->and($stripe->cancelled)->toHaveCount(1)
        ->and($order->statusHistories()->count())->toBe(2);
});

it('refuses to cancel an order that already shipped', function (): void {
    $customer = User::factory()->create();
    $order = makeOrderFor($customer, OrderStatus::Shipped);

    Sanctum::actingAs($customer, ['customer']);

    $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertStatus(422);

    expect($order->fresh()->status)->toBe(OrderStatus::Shipped);
});
