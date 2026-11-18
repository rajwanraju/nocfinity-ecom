<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\UserType;
use App\Http\Controllers\Api\V1\Auth\Concerns\BuildsAuthPayload;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerAuthController
{
    use BuildsAuthPayload;

    public function __construct(private readonly AuthService $authService) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return ApiResponse::created(
            $this->authPayload($result),
            'Account created successfully.',
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->string('email')->toString(),
            $request->string('password')->toString(),
            $request->ip() ?? '',
            UserType::Customer,
        );

        return ApiResponse::success($this->authPayload($result), 'Logged in successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(new UserResource($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return ApiResponse::success(null, 'Logged out successfully.');
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->authService->changePassword(
            $request->user(),
            $request->string('current_password')->toString(),
            $request->string('password')->toString(),
        );

        return ApiResponse::success(null, 'Password updated. Other sessions have been signed out.');
    }
}
