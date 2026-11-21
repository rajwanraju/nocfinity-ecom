<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminCouponIndexRequest;
use App\Http\Requests\Admin\CouponRequest;
use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    public function index(AdminCouponIndexRequest $request): JsonResponse
    {
        $filters = $request->validated();

        $paginator = Coupon::query()
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query
                ->where('code', 'like', '%'.trim($search).'%'))
            ->when(array_key_exists('active', $filters), fn (Builder $query) => $query
                ->where('is_active', (bool) $filters['active']))
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();

        return ApiResponse::success(
            CouponResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }

    public function store(CouponRequest $request, ActivityLogger $activity): JsonResponse
    {
        $coupon = Coupon::query()->create($request->validated());
        $coupon->refresh();

        $activity->log('coupon.created', $coupon, "Coupon {$coupon->code} created.");

        return ApiResponse::created(new CouponResource($coupon), 'Coupon created.');
    }

    public function show(Coupon $coupon): JsonResponse
    {
        return ApiResponse::success(new CouponResource($coupon));
    }

    public function update(CouponRequest $request, Coupon $coupon, ActivityLogger $activity): JsonResponse
    {
        $coupon->fill($request->validated())->save();

        $activity->log('coupon.updated', $coupon, "Coupon {$coupon->code} updated.");

        return ApiResponse::success(new CouponResource($coupon), 'Coupon updated.');
    }

    public function destroy(Coupon $coupon, ActivityLogger $activity): JsonResponse
    {
        $code = $coupon->code;

        $coupon->delete();

        $activity->log('coupon.deleted', $coupon, "Coupon {$code} deleted.");

        return ApiResponse::noContent();
    }
}
