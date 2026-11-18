<?php

use App\Models\User;

it('throttles login after five failed attempts with a Retry-After header', function (): void {
    User::factory()->create([
        'email' => 'casey@example.test',
        'password' => 'StrongPass123!',
    ]);

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'casey@example.test',
            'password' => 'WrongPass123!',
        ])->assertUnauthorized();
    }

    $blocked = $this->postJson('/api/v1/auth/login', [
        'email' => 'casey@example.test',
        'password' => 'WrongPass123!',
    ]);

    $blocked->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJsonPath('message', 'Too many login attempts. Please try again later.');

    // Even the correct password is blocked during the decay window.
    $this->postJson('/api/v1/auth/login', [
        'email' => 'casey@example.test',
        'password' => 'StrongPass123!',
    ])->assertStatus(429);
});

it('rate limits password reset requests from one IP', function (): void {
    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => "user{$attempt}@example.test",
        ])->assertOk();
    }

    $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'user6@example.test',
    ])->assertStatus(429)->assertHeader('Retry-After');
});

it('rate limits registration attempts from one IP', function (): void {
    for ($attempt = 1; $attempt <= 10; $attempt++) {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Spam',
            'email' => "spam{$attempt}@example.test",
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ])->assertCreated();
    }

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Spam',
        'email' => 'spam11@example.test',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
    ])->assertStatus(429)->assertHeader('Retry-After');
});

it('clears the failure counter after a successful login', function (): void {
    $user = User::factory()->create([
        'email' => 'casey@example.test',
        'password' => 'StrongPass123!',
    ]);

    for ($attempt = 1; $attempt <= 4; $attempt++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'casey@example.test',
            'password' => 'WrongPass123!',
        ])->assertUnauthorized();
    }

    $this->postJson('/api/v1/auth/login', [
        'email' => 'casey@example.test',
        'password' => 'StrongPass123!',
    ])->assertOk();

    // Counter reset: four more failures are allowed again.
    for ($attempt = 1; $attempt <= 4; $attempt++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'casey@example.test',
            'password' => 'WrongPass123!',
        ])->assertUnauthorized();
    }
});
