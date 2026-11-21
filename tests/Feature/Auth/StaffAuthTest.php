<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
});

it('logs a staff member in and returns the effective permission matrix', function (): void {
    $staff = User::factory()->staff()->create([
        'email' => 'product.manager@nocfinity.test',
        'password' => 'StrongPass123!',
    ]);
    $staff->assignRole('Product Manager');

    $response = $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'product.manager@nocfinity.test',
        'password' => 'StrongPass123!',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('data.user.type', 'staff')
        ->assertJsonPath('data.abilities', ['staff'])
        ->assertJsonPath('data.user.roles.0', 'Product Manager');

    $permissions = $response->json('data.user.permissions');

    expect($permissions)->toContain('products.view')
        ->and($permissions)->toContain('categories.manage')
        ->and($permissions)->not->toContain('roles.manage');

    $token = $response->json('data.token');

    $this->withToken($token)
        ->getJson('/api/v1/admin/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'product.manager@nocfinity.test')
        ->assertJsonStructure(['data' => ['roles', 'permissions']]);
});

it('does not allow a customer to log in through the staff endpoint', function (): void {
    User::factory()->create([
        'email' => 'customer@example.test',
        'password' => 'StrongPass123!',
    ]);

    $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'customer@example.test',
        'password' => 'StrongPass123!',
    ])->assertUnauthorized()->assertJsonPath('message', 'Invalid credentials.');
});

it('rejects a customer token on staff routes and a staff token on customer routes', function (): void {
    $customer = User::factory()->create(['password' => 'StrongPass123!']);
    $staff = User::factory()->staff()->create(['password' => 'StrongPass123!']);

    $customerToken = $this->postJson('/api/v1/auth/login', [
        'email' => $customer->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $staffToken = $this->postJson('/api/v1/admin/auth/login', [
        'email' => $staff->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->withToken($customerToken)->getJson('/api/v1/admin/auth/me')->assertForbidden();

    forgetAuthGuards();

    $this->withToken($staffToken)->getJson('/api/v1/auth/me')->assertForbidden();
});

it('rejects an inactive staff account with the generic message', function (): void {
    User::factory()->staff()->inactive()->create([
        'email' => 'inactive.staff@nocfinity.test',
        'password' => 'StrongPass123!',
    ]);

    $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'inactive.staff@nocfinity.test',
        'password' => 'StrongPass123!',
    ])->assertUnauthorized()->assertJsonPath('message', 'Invalid credentials.');
});

it('revokes the staff token on logout', function (): void {
    $staff = User::factory()->staff()->create(['password' => 'StrongPass123!']);

    $token = $this->postJson('/api/v1/admin/auth/login', [
        'email' => $staff->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->withToken($token)->postJson('/api/v1/admin/auth/logout')->assertOk();

    forgetAuthGuards();

    $this->withToken($token)->getJson('/api/v1/admin/auth/me')->assertUnauthorized();
});
