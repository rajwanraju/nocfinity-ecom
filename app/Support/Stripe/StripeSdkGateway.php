<?php

namespace App\Support\Stripe;

use App\Exceptions\StripeWebhookSignatureException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeSdkGateway implements StripeGateway
{
    private ?StripeClient $client = null;

    /**
     * @param  array<string, string>  $metadata
     * @return array{id: string, client_secret: string, status: string}
     */
    public function createPaymentIntent(
        int $amount,
        string $currency,
        array $metadata,
        string $idempotencyKey,
    ): array {
        $intent = $this->client()->paymentIntents->create([
            'amount' => $amount,
            'currency' => $currency,
            'payment_method_types' => ['card'],
            'metadata' => $metadata,
        ], ['idempotency_key' => $idempotencyKey]);

        return [
            'id' => $intent->id,
            'client_secret' => (string) $intent->client_secret,
            'status' => (string) $intent->status,
        ];
    }

    public function cancelPaymentIntent(string $paymentIntentId): void
    {
        $this->client()->paymentIntents->cancel($paymentIntentId);
    }

    public function refund(string $paymentIntentId, int $amount, string $idempotencyKey): string
    {
        $refund = $this->client()->refunds->create([
            'payment_intent' => $paymentIntentId,
            'amount' => $amount,
        ], ['idempotency_key' => $idempotencyKey]);

        return $refund->id;
    }

    public function verifyWebhook(string $payload, string $signature): void
    {
        try {
            Webhook::constructEvent(
                $payload,
                $signature,
                (string) config('services.stripe.webhook_secret'),
            );
        } catch (SignatureVerificationException) {
            throw new StripeWebhookSignatureException;
        }
    }

    private function client(): StripeClient
    {
        return $this->client ??= new StripeClient((string) config('services.stripe.secret'));
    }
}
