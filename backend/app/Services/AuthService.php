<?php

namespace App\Services;

use App\Enums\UserType;
use App\Exceptions\InvalidCredentialsException;
use App\Exceptions\LoginThrottledException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * A valid bcrypt hash used to equalise response timing when the email does
     * not exist (prevents user enumeration by timing).
     */
    private const DUMMY_HASH = '$2y$12$Uk8uouY3Lkelp.fFxn6dy.Hu08XPc4xsM27Ns6h8/TryJxm9ioJoy';

    /**
     * FR-AUTH-5: five failed attempts per email + IP, then 429 with Retry-After.
     *
     * @return array{user: User, token: string, abilities: list<string>}
     */
    public function login(string $email, string $password, string $ip, UserType $expectedType): array
    {
        $key = $this->throttleKey($email, $ip);
        $maxAttempts = (int) config('auth.login_max_attempts', 5);
        $decaySeconds = (int) config('auth.login_decay_seconds', 60);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            throw new LoginThrottledException(RateLimiter::availableIn($key));
        }

        $user = User::query()->where('email', $email)->first();

        $passwordMatches = Hash::check($password, $user?->password ?? self::DUMMY_HASH);

        if (! $user || ! $passwordMatches || ! $user->is_active || $user->type !== $expectedType) {
            RateLimiter::hit($key, $decaySeconds);

            // FR-AUTH-6: identical message for every failure mode.
            throw new InvalidCredentialsException;
        }

        RateLimiter::clear($key);

        $user->forceFill(['last_login_at' => now()])->save();

        return [
            'user' => $user,
            'token' => $this->issueToken($user, $expectedType->value),
            'abilities' => [$expectedType->value],
        ];
    }

    /**
     * @param  array{name: string, email: string, password: string, phone?: string|null}  $data
     * @return array{user: User, token: string, abilities: list<string>}
     */
    public function register(array $data): array
    {
        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
        ]);

        // Privileged fields are never taken from request input (SEC-6).
        $user->forceFill([
            'type' => UserType::Customer,
            'is_active' => true,
        ])->save();

        return [
            'user' => $user,
            'token' => $this->issueToken($user, UserType::Customer->value),
            'abilities' => [UserType::Customer->value],
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->forceFill(['password' => $newPassword])->save();

        // FR-AUTH-8: every other session/token is revoked, the current one stays.
        $currentTokenId = $user->currentAccessToken()?->getKey();

        $user->tokens()
            ->when($currentTokenId !== null, fn ($query) => $query->whereKeyNot($currentTokenId))
            ->delete();
    }

    public function issueToken(User $user, string $ability): string
    {
        $expiresAt = now()->addMinutes((int) config('sanctum.expiration', 10080));

        return $user->createToken('bff-'.$ability, [$ability], $expiresAt)->plainTextToken;
    }

    private function throttleKey(string $email, string $ip): string
    {
        return 'login:'.mb_strtolower(trim($email)).'|'.$ip;
    }
}
