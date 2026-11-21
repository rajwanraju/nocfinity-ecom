<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Services\RoleService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(RoleService $roles): JsonResponse
    {
        return ApiResponse::success(RoleResource::collection($roles->roles())->resolve());
    }

    public function store(StoreRoleRequest $request, RoleService $roles): JsonResponse
    {
        $role = $roles->create($request->validated());

        return ApiResponse::created(new RoleResource($role), 'Role created.');
    }

    public function show(Role $role): JsonResponse
    {
        return ApiResponse::success(new RoleResource($role->load('permissions')->loadCount('users')));
    }

    public function update(UpdateRoleRequest $request, Role $role, RoleService $roles): JsonResponse
    {
        $role = $roles->update($role, $request->validated());

        return ApiResponse::success(new RoleResource($role), 'Role updated.');
    }

    public function destroy(Role $role, RoleService $roles): JsonResponse
    {
        $roles->delete($role);

        return ApiResponse::noContent();
    }
}
