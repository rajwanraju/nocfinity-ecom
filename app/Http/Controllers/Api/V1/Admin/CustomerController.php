<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminCustomerIndexRequest;
use App\Http\Resources\CustomerResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    public function index(AdminCustomerIndexRequest $request): JsonResponse
    {
        $filters = $request->validated();

        $paginator = $this->query()
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $term = '%'.trim($search).'%';

                $query->where(function (Builder $query) use ($term): void {
                    $query->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term);
                });
            })
            ->when(($filters['status'] ?? null) === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when(($filters['status'] ?? null) === 'inactive', fn (Builder $query) => $query->where('is_active', false))
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();

        return ApiResponse::success(
            CustomerResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }

    public function show(int $customer): JsonResponse
    {
        $user = $this->query()
            ->whereKey($customer)
            ->with(['orders' => fn ($query) => $query->latest('id')->with('items')])
            ->firstOrFail();

        return ApiResponse::success(new CustomerResource($user));
    }

    /**
     * FR-ADMIN-6: staff are never exposed through the customer API.
     */
    private function query(): Builder
    {
        return User::query()
            ->where('type', UserType::Customer)
            ->withCount('orders')
            ->withSum(
                ['orders as total_spent' => fn (Builder $query) => $query->whereIn('status', $this->paidStatuses())],
                'grand_total',
            )
            ->withMax('orders as last_order_at', 'created_at');
    }

    /**
     * @return list<string>
     */
    private function paidStatuses(): array
    {
        return array_map(
            fn (OrderStatus $status): string => $status->value,
            array_filter(OrderStatus::cases(), fn (OrderStatus $status): bool => $status->isPaid()),
        );
    }
}
