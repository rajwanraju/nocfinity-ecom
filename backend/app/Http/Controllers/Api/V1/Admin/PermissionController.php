<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Support\ApiResponse;
use App\Support\PermissionRegistry;
use Illuminate\Http\JsonResponse;

class PermissionController
{
    /**
     * FR-RBAC-7: permission groups plus the role assignment matrix, so the
     * admin UI can render permission rows and role columns in one request.
     */
    public function __invoke(RoleService $roles): JsonResponse
    {
        return ApiResponse::success([
            'groups' => PermissionRegistry::grouped(),
            'roles' => RoleResource::collection($roles->roles())->resolve(),
        ]);
    }
}
