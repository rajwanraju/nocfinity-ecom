<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ActivityLogIndexRequest;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    public function index(ActivityLogIndexRequest $request): JsonResponse
    {
        $filters = $request->validated();

        $paginator = ActivityLog::query()
            ->with('user:id,name')
            ->when($filters['action'] ?? null, fn (Builder $query, string $action) => $query
                ->where('action', $action))
            ->when($filters['user_id'] ?? null, fn (Builder $query, int $userId) => $query
                ->where('user_id', $userId))
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 20))
            ->withQueryString();

        return ApiResponse::success(
            ActivityLogResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }
}
