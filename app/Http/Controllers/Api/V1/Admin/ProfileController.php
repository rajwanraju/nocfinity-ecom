<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateProfileRequest;
use App\Http\Resources\StaffResource;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success(
            new StaffResource($request->user()->loadMissing('roles.permissions')),
        );
    }

    public function update(UpdateProfileRequest $request, ActivityLogger $activity): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $emailChanged = isset($data['email']) && $data['email'] !== $user->email;

        $user->fill($data);

        if ($emailChanged) {
            // A changed address has not been verified; the field is
            // privileged and must not be trusted from the request.
            $user->email_verified_at = null;
        }

        $user->save();

        $activity->log(
            'profile.updated',
            $user,
            'Staff profile updated.',
            ['fields' => array_keys($data)],
        );

        return ApiResponse::success(
            new StaffResource($user->fresh(['roles.permissions'])),
            'Profile updated.',
        );
    }
}
