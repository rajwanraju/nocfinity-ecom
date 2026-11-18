<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Throwable;

class PasswordResetService
{
    /**
     * FR-AUTH-6: the caller always receives the same response, whether or not
     * the email exists. Delivery failures are logged, never exposed.
     */
    public function sendLink(string $email): void
    {
        try {
            Password::broker()->sendResetLink(['email' => $email]);
        } catch (Throwable $e) {
            report($e);
        }
    }

    /**
     * @param  array{email: string, password: string, password_confirmation: string, token: string}  $credentials
     */
    public function reset(array $credentials): void
    {
        $status = Password::broker()->reset($credentials, function (User $user, string $password): void {
            $user->forceFill(['password' => $password])->save();

            // FR-AUTH-8: a password reset signs every device out.
            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            $message = match ($status) {
                Password::INVALID_TOKEN => 'This password reset token is invalid or has expired.',
                Password::INVALID_USER => 'This password reset token is invalid or has expired.',
                Password::RESET_THROTTLED => 'Please wait before requesting another reset.',
                default => 'Unable to reset the password. Please request a new link.',
            };

            throw ValidationException::withMessages(['token' => [$message]]);
        }
    }
}
