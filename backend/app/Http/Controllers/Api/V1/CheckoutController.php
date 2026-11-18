<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Http\Resources\OrderResource;
use App\Services\CheckoutService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    public function store(CheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        $result = $checkout->checkout(
            $request->user(),
            $request->validated(),
            $request->header('Idempotency-Key'),
        );

        $payload = [
            'order' => new OrderResource($result['order']),
            'payment' => ['client_secret' => $result['client_secret']],
        ];

        return $result['created']
            ? ApiResponse::created($payload, 'Order created.')
            : ApiResponse::success($payload, 'Order already created.');
    }
}
