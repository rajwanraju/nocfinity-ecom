<?php

use App\Models\StripeWebhookEvent;
use App\Support\Stripe\StripeGateway;
use App\Support\Stripe\StripeSdkGateway;

it('accepts a correctly signed Stripe payload', function (): void {
    config(['services.stripe.webhook_secret' => 'whsec_test']);

    $payload = json_encode([
        'id' => 'evt_signed_ok',
        'type' => 'customer.created',
        'data' => ['object' => ['id' => 'cus_123']],
    ], JSON_THROW_ON_ERROR);

    $timestamp = time();
    $signature = hash_hmac('sha256', $timestamp.'.'.$payload, 'whsec_test');

    $response = $this->call(
        'POST',
        '/api/v1/webhooks/stripe',
        [],
        [],
        [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}",
        ],
        $payload,
    );

    $response->assertOk()->assertJsonPath('data.received', true);

    expect(StripeWebhookEvent::query()->where('stripe_event_id', 'evt_signed_ok')->exists())->toBeTrue();
});

it('rejects a Stripe payload with a wrong signature', function (): void {
    config(['services.stripe.webhook_secret' => 'whsec_test']);

    $this->instance(StripeGateway::class, new StripeSdkGateway);

    $payload = json_encode([
        'id' => 'evt_signed_bad',
        'type' => 'customer.created',
        'data' => ['object' => ['id' => 'cus_123']],
    ], JSON_THROW_ON_ERROR);

    $timestamp = time();

    $response = $this->call(
        'POST',
        '/api/v1/webhooks/stripe',
        [],
        [],
        [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1=deadbeef",
        ],
        $payload,
    );

    $response->assertStatus(400)->assertJsonPath('success', false);
    expect(StripeWebhookEvent::query()->count())->toBe(0);
});
