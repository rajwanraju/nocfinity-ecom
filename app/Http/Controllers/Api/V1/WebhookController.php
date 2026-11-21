<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PaymentWebhookService;
use App\Support\ApiResponse;
use App\Support\Stripe\StripeGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use JsonException;

class WebhookController extends Controller
{
    public function handle(
        Request $request,
        StripeGateway $stripe,
        PaymentWebhookService $payments,
    ): JsonResponse {
        $payload = $request->getContent();

        // FR-ORDER-7: verify the signature before parsing or trusting anything.
        $stripe->verifyWebhook($payload, (string) $request->header('Stripe-Signature'));

        try {
            $event = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return ApiResponse::error('Invalid webhook payload.', [], 400);
        }

        if (! is_array($event) || ! isset($event['id'], $event['type'])) {
            return ApiResponse::error('Invalid webhook payload.', [], 400);
        }

        $payments->handle($event);

        return ApiResponse::success(['received' => true]);
    }
}
