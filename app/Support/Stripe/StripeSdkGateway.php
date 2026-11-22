<?php

namespace App\Support\Stripe;

use App\Exceptions\PaymentGatewayUnavailableException;
use App\Exceptions\StripeWebhookSignatureException;
use Stripe\Exception\ApiErrorException;
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
        try {
            // `payment_method_types` was removed from the Stripe API: the
            // dashboard now controls which methods are enabled. Sending it
            // makes every PaymentIntent fail with an invalid-request error.
            $intent = $this->client()->paymentIntents->create([
                'amount' => $amount,
                'currency' => $currency,
                'metadata' => $metadata,
            ], ['idempotency_key' => $idempotencyKey]);
        } catch (ApiErrorException $e) {
            // Keep the provider detail in the log and give the client a stable
            // 503 instead of a raw 500 with the Stripe message.
            report($e);

            throw new PaymentGatewayUnavailableException;
        }

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
        $secret = trim((string) config('services.stripe.webhook_secret'));

        // An empty signing secret would let anyone forge a valid HMAC, so an
        // unconfigured endpoint must reject every webhook.
        if ($secret === '' || $signature === '') {
            throw new StripeWebhookSignatureException;
        }

        try {
            Webhook::constructEvent($payload, $signature, $secret);
        } catch (SignatureVerificationException) {
            throw new StripeWebhookSignatureException;
        }
    }

    private function client(): StripeClient
    {
        $secret = trim((string) config('services.stripe.secret'));

        // The SDK throws "api_key cannot be the empty string"; surface a domain
        // error instead so callers can respond with a controlled 503.
        if ($secret === '') {
            throw new PaymentGatewayUnavailableException;
        }

        return $this->client ??= new StripeClient($secret);
    }
}
