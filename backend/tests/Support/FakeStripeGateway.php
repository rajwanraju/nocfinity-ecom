<?php

namespace Tests\Support;

use App\Exceptions\StripeWebhookSignatureException;
use App\Support\Stripe\StripeGateway;

class FakeStripeGateway implements StripeGateway
{
    /** @var list<array<string, mixed>> */
    public array $intents = [];

    /** @var list<array<string, mixed>> */
    public array $refunds = [];

    /** @var list<string> */
    public array $cancelled = [];

    /** @var list<array{payload: string, signature: string}> */
    public array $verified = [];

    public bool $verify = true;

    private int $intentCounter = 0;

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
        $this->intentCounter++;
        $id = 'pi_fake_'.$this->intentCounter;

        $this->intents[] = compact('amount', 'currency', 'metadata', 'idempotencyKey', 'id');

        return [
            'id' => $id,
            'client_secret' => $id.'_secret',
            'status' => 'requires_payment_method',
        ];
    }

    public function cancelPaymentIntent(string $paymentIntentId): void
    {
        $this->cancelled[] = $paymentIntentId;
    }

    public function refund(string $paymentIntentId, int $amount, string $idempotencyKey): string
    {
        $this->refunds[] = compact('paymentIntentId', 'amount', 'idempotencyKey');

        return 're_fake_'.count($this->refunds);
    }

    public function verifyWebhook(string $payload, string $signature): void
    {
        $this->verified[] = compact('payload', 'signature');

        if (! $this->verify) {
            throw new StripeWebhookSignatureException;
        }
    }
}
