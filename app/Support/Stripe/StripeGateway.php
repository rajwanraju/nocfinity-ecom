<?php

namespace App\Support\Stripe;

/**
 * Thin seam around the Stripe SDK. Tests mock this contract, so the whole
 * checkout/webhook flow can be verified without network calls or keys.
 */
interface StripeGateway
{
    /**
     * @param  array<string, string>  $metadata
     * @return array{id: string, client_secret: string, status: string}
     */
    public function createPaymentIntent(
        int $amount,
        string $currency,
        array $metadata,
        string $idempotencyKey,
    ): array;

    public function cancelPaymentIntent(string $paymentIntentId): void;

    public function refund(string $paymentIntentId, int $amount, string $idempotencyKey): string;

    /**
     * Throws StripeWebhookSignatureException when the signature is invalid.
     */
    public function verifyWebhook(string $payload, string $signature): void;
}
