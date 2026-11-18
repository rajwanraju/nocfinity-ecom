<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);

    $this->superAdmin = User::factory()->staff()->create();
    $this->superAdmin->assignRole('Super Admin');
    Sanctum::actingAs($this->superAdmin, ['staff']);
});

it('lists staff with pagination and without sensitive fields', function (): void {
    User::factory()->staff()->count(2)->create();

    $response = $this->getJson('/api/v1/admin/staff')->assertOk();

    $response->assertJsonPath('meta.pagination.total', 3)
        ->assertJsonPath('meta.pagination.per_page', 15)
        ->assertJsonCount(3, 'data');

    $first = $response->json('data.0');

    expect($first)->toHaveKeys(['id', 'name', 'email', 'roles', 'permissions', 'is_active'])
        ->and($first)->not->toHaveKey('password');
});

it('filters the staff list by search, role and status', function (): void {
    $manager = User::factory()->staff()->create(['name' => 'Mira Manager']);
    $manager->assignRole('Product Manager');

    User::factory()->staff()->inactive()->create(['name' => 'Ian Inactive']);

    $search = $this->getJson('/api/v1/admin/staff?search=Mira')->assertOk();
    expect($search->json('meta.pagination.total'))->toBe(1);

    $byRole = $this->getJson('/api/v1/admin/staff?role=Product Manager')->assertOk();
    expect($byRole->json('meta.pagination.total'))->toBe(1)
        ->and($byRole->json('data.0.email'))->toBe($manager->email);

    $inactive = $this->getJson('/api/v1/admin/staff?status=inactive')->assertOk();
    expect($inactive->json('meta.pagination.total'))->toBe(1);
});

it('creates a staff member with roles and a hashed password', function (): void {
    $response = $this->postJson('/api/v1/admin/staff', [
        'name' => 'Nora New',
        'email' => 'nora@nocfinity.test',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
        'phone' => '+1 555 0100',
        'roles' => ['Order Manager', 'Support'],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'nora@nocfinity.test')
        ->assertJsonPath('data.type', 'staff')
        ->assertJsonPath('data.is_active', true);

    expect($response->json('data.roles'))->toEqualCanonicalizing(['Order Manager', 'Support']);

    $user = User::query()->where('email', 'nora@nocfinity.test')->firstOrFail();

    expect($user->hasRole('Order Manager'))->toBeTrue()
        ->and($user->password)->not->toBe('StrongPass123!')
        ->and(password_get_info($user->password)['algo'])->toBe(PASSWORD_BCRYPT);

    $this->assertDatabaseMissing('users', ['email' => 'nora@nocfinity.test', 'password' => 'StrongPass123!']);
});

it('validates staff creation', function (): void {
    User::factory()->staff()->create(['email' => 'taken@nocfinity.test']);

    $this->postJson('/api/v1/admin/staff', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email', 'password', 'roles']);

    $payload = [
        'name' => 'Weak Person',
        'email' => 'taken@nocfinity.test',
        'password' => 'weak',
        'password_confirmation' => 'weak',
        'roles' => ['Not A Role'],
    ];

    $this->postJson('/api/v1/admin/staff', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password', 'roles.0']);
});

it('updates staff details, roles and deactivates a staff member', function (): void {
    $staff = User::factory()->staff()->create([
        'email' => 'staff@nocfinity.test',
        'password' => 'StrongPass123!',
    ]);
    $staff->assignRole('Support');

    $token = $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'staff@nocfinity.test',
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->patchJson("/api/v1/admin/staff/{$staff->id}", [
        'name' => 'Updated Name',
        'roles' => ['Order Manager'],
        'is_active' => false,
    ])->assertOk()
        ->assertJsonPath('data.name', 'Updated Name')
        ->assertJsonPath('data.is_active', false);

    expect($staff->fresh()->hasRole('Order Manager'))->toBeTrue()
        ->and($staff->fresh()->hasRole('Support'))->toBeFalse()
        ->and($staff->tokens()->count())->toBe(0);

    forgetAuthGuards();

    $this->withToken($token)->getJson('/api/v1/admin/auth/me')->assertUnauthorized();
});

it('deactivates instead of deleting so the audit trail survives', function (): void {
    $staff = User::factory()->staff()->create();
    $staff->assignRole('Support');

    $this->deleteJson("/api/v1/admin/staff/{$staff->id}")->assertNoContent();

    expect($staff->fresh())->not->toBeNull()
        ->and($staff->fresh()->is_active)->toBeFalse();
});

it('never modifies or deactivates a Super Admin account', function (): void {
    $otherSuperAdmin = User::factory()->staff()->create();
    $otherSuperAdmin->assignRole('Super Admin');

    $this->patchJson("/api/v1/admin/staff/{$otherSuperAdmin->id}", [
        'roles' => ['Support'],
    ])->assertForbidden();

    $this->deleteJson("/api/v1/admin/staff/{$otherSuperAdmin->id}")->assertForbidden();

    expect($otherSuperAdmin->fresh()->hasRole('Super Admin'))->toBeTrue()
        ->and($otherSuperAdmin->fresh()->is_active)->toBeTrue();
});

it('prevents staff from deactivating themselves', function (): void {
    $this->deleteJson("/api/v1/admin/staff/{$this->superAdmin->id}")->assertForbidden();

    expect($this->superAdmin->fresh()->is_active)->toBeTrue();
});

it('stops an Admin from granting the Super Admin role', function (): void {
    $admin = User::factory()->staff()->create();
    $admin->assignRole('Admin');

    Sanctum::actingAs($admin, ['staff']);

    $this->postJson('/api/v1/admin/staff', [
        'name' => 'Would Be Root',
        'email' => 'root@nocfinity.test',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
        'roles' => ['Super Admin'],
    ])->assertForbidden();

    $this->assertDatabaseMissing('users', ['email' => 'root@nocfinity.test']);

    $staff = User::factory()->staff()->create();
    $staff->assignRole('Support');

    $this->patchJson("/api/v1/admin/staff/{$staff->id}", [
        'roles' => ['Super Admin'],
    ])->assertForbidden();

    expect($staff->fresh()->hasRole('Super Admin'))->toBeFalse();
});
