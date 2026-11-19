<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminOrderIndexRequest;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Http\Resources\AdminOrderResource;
use App\Models\Order;
use App\Services\ActivityLogger;
use App\Services\OrderService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(AdminOrderIndexRequest $request): JsonResponse
    {
        $filters = $request->validated();

        $paginator = Order::query()
            ->with(['user:id,name,email', 'latestPayment'])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $term = '%'.trim($search).'%';

                $query->where(function (Builder $query) use ($term): void {
                    $query->where('order_number', 'like', $term)
                        ->orWhere('customer_email', 'like', $term)
                        ->orWhere('customer_name', 'like', $term);
                });
            })
            ->latest('created_at')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();

        return ApiResponse::success(
            AdminOrderResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }

    public function show(Order $order): JsonResponse
    {
        return ApiResponse::success(new AdminOrderResource($this->detail($order)));
    }

    public function updateStatus(
        UpdateOrderStatusRequest $request,
        Order $order,
        OrderService $orders,
        ActivityLogger $activity,
    ): JsonResponse {
        $to = OrderStatus::from($request->validated('status'));

        // FR-ORDER-5: only the verified Stripe webhook may mark an order paid,
        // because it also owns the stock and coupon side effects.
        if ($to === OrderStatus::Paid) {
            throw ValidationException::withMessages([
                'status' => ['Paid status is set by the payment webhook only.'],
            ]);
        }

        if ($to === OrderStatus::Cancelled && ! $request->user()->can('orders.cancel')) {
            abort(403, 'You are not allowed to cancel orders.');
        }

        $from = $order->status;

        $order = $orders->transition(
            $order,
            $to,
            $request->user(),
            $request->validated('note'),
        );

        $activity->log(
            'order.status_updated',
            $order,
            "Order {$order->order_number} moved from {$from->value} to {$to->value}.",
            ['from' => $from->value, 'to' => $to->value],
        );

        return ApiResponse::success(
            new AdminOrderResource($this->detail($order)),
            'Order status updated.',
        );
    }

    private function detail(Order $order): Order
    {
        return $order->load(['user:id,name,email', 'items', 'latestPayment', 'statusHistories']);
    }
}
