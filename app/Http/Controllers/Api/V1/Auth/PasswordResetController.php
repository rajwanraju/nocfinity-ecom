<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\PasswordResetService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PasswordResetController
{
    public function __construct(private readonly PasswordResetService $passwordResetService) {}

    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $this->passwordResetService->sendLink($request->string('email')->toString());

        return ApiResponse::success(
            null,
            'If an account exists for that email, a password reset link has been sent.',
        );
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $this->passwordResetService->reset($request->validated());

        return ApiResponse::success(null, 'Password reset successfully. Please sign in with your new password.');
    }
}
