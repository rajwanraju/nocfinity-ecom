<?php

use App\Enums\UserType;
use App\Models\User;

it('ignores privileged attributes sent through mass assignment', function (): void {
    $user = User::query()->create([
        'name' => 'Mallory',
        'email' => 'mallory@example.test',
        'password' => 'Password123!',
        'type' => 'staff',
        'is_active' => false,
        'email_verified_at' => now(),
    ]);

    $user->refresh();

    expect($user->type)->toBe(UserType::Customer)
        ->and($user->is_active)->toBeTrue()
        ->and($user->email_verified_at)->toBeNull();
});
