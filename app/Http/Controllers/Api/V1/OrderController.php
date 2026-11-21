<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginator = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['items', 'latestPayment'])
            ->latest('created_at')
            ->paginate(10);

        return ApiResponse::success(
            OrderResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        // FR-ORDER-13: the policy decides ownership; a denial looks like a
        // missing order so ids cannot be probed.
        abort_unless($request->user()->can('view', $order), 404);

        $order->load(['items', 'latestPayment', 'statusHistories']);

        return ApiResponse::success(new OrderResource($order));
    }

    public function cancel(Request $request, Order $order, OrderService $orders): JsonResponse
    {
        abort_unless($request->user()->can('view', $order), 404);

        if (! $request->user()->can('cancel', $order)) {
            return ApiResponse::error('This order can no longer be cancelled.', [], 422);
        }

        $cancelled = $orders->transition(
            $order,
            OrderStatus::Cancelled,
            $request->user(),
            'Cancelled by customer.',
        );

        return ApiResponse::success(new OrderResource($cancelled), 'Order cancelled.');
    }
}
