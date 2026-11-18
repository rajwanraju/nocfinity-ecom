<?php

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

it('sends a queued reset notification and never reveals whether the email exists', function (): void {
    Notification::fake();

    $user = User::factory()->create(['email' => 'known@example.test']);

    $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.test']);
    $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test']);

    $known->assertOk()->assertJsonPath('success', true);
    $unknown->assertOk();

    expect($known->json('message'))->toBe($unknown->json('message'));

    Notification::assertSentTo($user, ResetPasswordNotification::class);
    Notification::assertCount(1);
});

it('resets the password with a valid single-use token and revokes all tokens', function (): void {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'known@example.test',
        'password' => 'StrongPass123!',
    ]);

    $oldToken = $this->postJson('/api/v1/auth/login', [
        'email' => 'known@example.test',
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.test'])->assertOk();

    $resetToken = null;
    Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use (&$resetToken): bool {
        $resetToken = $notification->token;

        return true;
    });

    expect($resetToken)->toBeString()->not->toBeEmpty();

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $resetToken,
        'email' => 'known@example.test',
        'password' => 'NewStrongPass456!',
        'password_confirmation' => 'NewStrongPass456!',
    ])->assertOk();

    $user->refresh();

    expect(Hash::check('NewStrongPass456!', $user->password))->toBeTrue()
        ->and(Hash::check('StrongPass123!', $user->password))->toBeFalse();

    $this->withToken($oldToken)->getJson('/api/v1/auth/me')->assertUnauthorized();

    // Single use: the same token cannot be replayed.
    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $resetToken,
        'email' => 'known@example.test',
        'password' => 'ThirdStrongPass789!',
        'password_confirmation' => 'ThirdStrongPass789!',
    ])->assertUnprocessable()->assertJsonValidationErrors('token');
});

it('rejects an expired reset token after sixty minutes', function (): void {
    Notification::fake();

    $user = User::factory()->create(['email' => 'known@example.test']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.test'])->assertOk();

    $resetToken = null;
    Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use (&$resetToken): bool {
        $resetToken = $notification->token;

        return true;
    });

    DB::table('password_reset_tokens')
        ->where('email', 'known@example.test')
        ->update(['created_at' => now()->subMinutes(61)]);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $resetToken,
        'email' => 'known@example.test',
        'password' => 'NewStrongPass456!',
        'password_confirmation' => 'NewStrongPass456!',
    ])->assertUnprocessable()->assertJsonValidationErrors('token');
});

it('enforces the password policy on reset', function (): void {
    Notification::fake();

    $user = User::factory()->create(['email' => 'known@example.test']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.test'])->assertOk();

    $resetToken = null;
    Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use (&$resetToken): bool {
        $resetToken = $notification->token;

        return true;
    });

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $resetToken,
        'email' => 'known@example.test',
        'password' => 'weak',
        'password_confirmation' => 'weak',
    ])->assertUnprocessable()->assertJsonValidationErrors('password');
});
