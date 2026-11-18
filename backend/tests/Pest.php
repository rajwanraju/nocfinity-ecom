<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test case / Pest bootstrap
|--------------------------------------------------------------------------
|
| Feature tests boot the full Laravel application. Unit tests stay plain.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/**
 * Sanctum's guard caches the resolved user for the lifetime of the test
 * application. Real HTTP requests get a fresh application each time, so tests
 * that switch tokens must explicitly forget the guard.
 */
function forgetAuthGuards(): void
{
    app('auth')->forgetGuards();
}

/**
 * Seeds are the caller's responsibility; this only builds and authenticates
 * a Super Admin staff token for RBAC-protected admin endpoints.
 */
function actingAsSuperAdmin(): User
{
    $user = User::factory()->staff()->create();
    $user->assignRole(User::SUPER_ADMIN_ROLE);

    Sanctum::actingAs($user, ['staff']);

    return $user;
}
