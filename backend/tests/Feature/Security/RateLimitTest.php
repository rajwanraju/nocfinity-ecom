<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

/*
|--------------------------------------------------------------------------
| SEC-10: rate limits beyond the login/reset/register/coupon suites
|--------------------------------------------------------------------------
*/

it('throttles checkout attempts per customer', function (): void {
    Sanctum::actingAs(User::factory()->create(), ['customer']);

    // Empty-cart attempts still count against the limiter (10/min).
    for ($attempt = 1; $attempt <= 10; $attempt++) {
        $this->postJson('/api/v1/checkout', checkoutAddress())->assertUnprocessable();
    }

    $this->postJson('/api/v1/checkout', checkoutAddress())
        ->assertStatus(429)
        ->assertHeader('Retry-After');
});

it('caps general API traffic per client', function (): void {
    for ($request = 1; $request <= 120; $request++) {
        $this->getJson('/api/v1/health')->assertOk();
    }

    $this->getJson('/api/v1/health')
        ->assertStatus(429)
        ->assertHeader('Retry-After');
});
