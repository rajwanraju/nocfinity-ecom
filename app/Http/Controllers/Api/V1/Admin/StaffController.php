<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStaffRequest;
use App\Http\Requests\Admin\UpdateStaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\User;
use App\Services\StaffService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function index(Request $request, StaffService $staff): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $paginator = $staff->paginate($request->only(['search', 'role', 'status']));

        return ApiResponse::success(
            StaffResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }

    public function store(StoreStaffRequest $request, StaffService $staff): JsonResponse
    {
        $this->authorize('create', User::class);

        $user = $staff->create($request->validated(), $request->user());

        return ApiResponse::created(new StaffResource($user), 'Staff member created.');
    }

    public function show(User $staff): JsonResponse
    {
        $this->authorize('view', $staff);

        return ApiResponse::success(new StaffResource($staff->load('roles.permissions')));
    }

    public function update(UpdateStaffRequest $request, User $staff, StaffService $service): JsonResponse
    {
        $this->authorize('update', $staff);

        $user = $service->update($staff, $request->validated(), $request->user());

        return ApiResponse::success(new StaffResource($user), 'Staff member updated.');
    }

    public function destroy(Request $request, User $staff, StaffService $service): JsonResponse
    {
        $this->authorize('delete', $staff);

        $service->deactivate($staff, $request->user());

        return ApiResponse::noContent();
    }
}
