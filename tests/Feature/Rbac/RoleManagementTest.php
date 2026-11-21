<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);

    $this->superAdmin = User::factory()->staff()->create();
    $this->superAdmin->assignRole('Super Admin');
    Sanctum::actingAs($this->superAdmin, ['staff']);
});

it('returns the grouped permission matrix for the roles page', function (): void {
    $response = $this->getJson('/api/v1/admin/permissions')->assertOk();

    $groups = collect($response->json('data.groups'));

    expect($groups)->toHaveCount(6)
        ->and($groups->pluck('key')->all())->toBe([
            'catalog', 'orders', 'marketing', 'customers', 'reports', 'administration',
        ]);

    $permissionNames = $groups->flatMap(fn (array $group): array => array_column($group['permissions'], 'name'));

    expect($permissionNames->all())->toEqualCanonicalizing(RolePermissionSeeder::PERMISSIONS);

    $roles = collect($response->json('data.roles'));

    expect($roles)->toHaveCount(5)
        ->and($roles->firstWhere('name', 'Super Admin')['permissions'])->toEqualCanonicalizing(RolePermissionSeeder::PERMISSIONS)
        ->and($roles->firstWhere('name', 'Support')['permissions'])->toEqualCanonicalizing(['orders.view', 'customers.view']);
});

it('lists roles with their permissions and staff count', function (): void {
    $response = $this->getJson('/api/v1/admin/roles')->assertOk();

    $roles = collect($response->json('data'));
    $admin = $roles->firstWhere('name', 'Admin');

    expect($roles)->toHaveCount(5)
        ->and($admin)->toHaveKeys(['id', 'name', 'is_system', 'permissions', 'staff_count'])
        ->and($admin['is_system'])->toBeFalse()
        ->and($admin['staff_count'])->toBe(0);
});

it('creates a custom role with permissions', function (): void {
    $response = $this->postJson('/api/v1/admin/roles', [
        'name' => 'Content Editor',
        'permissions' => ['products.view', 'products.edit', 'categories.manage'],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Content Editor')
        ->assertJsonPath('data.is_system', false);

    expect($response->json('data.permissions'))
        ->toEqualCanonicalizing(['products.view', 'products.edit', 'categories.manage']);

    $this->assertDatabaseHas('roles', ['name' => 'Content Editor', 'guard_name' => 'web']);
});

it('updates a custom role name and permissions', function (): void {
    $role = Role::create(['name' => 'Temp Role', 'guard_name' => 'web']);
    $role->syncPermissions(['products.view']);

    $this->patchJson("/api/v1/admin/roles/{$role->id}", [
        'name' => 'Support Lead',
        'permissions' => ['orders.view', 'customers.view', 'orders.cancel'],
    ])->assertOk()
        ->assertJsonPath('data.name', 'Support Lead');

    expect($role->fresh()->getPermissionNames()->all())
        ->toEqualCanonicalizing(['orders.view', 'customers.view', 'orders.cancel']);
});

it('deletes an unused custom role', function (): void {
    $role = Role::create(['name' => 'Disposable', 'guard_name' => 'web']);

    $this->deleteJson("/api/v1/admin/roles/{$role->id}")->assertNoContent();

    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

it('never modifies or deletes the Super Admin role', function (): void {
    $role = Role::findByName('Super Admin', 'web');

    $this->patchJson("/api/v1/admin/roles/{$role->id}", [
        'name' => 'Renamed',
        'permissions' => ['products.view'],
    ])->assertForbidden();

    $this->deleteJson("/api/v1/admin/roles/{$role->id}")->assertForbidden();

    expect($role->fresh()->name)->toBe('Super Admin')
        ->and($role->fresh()->getPermissionNames())->toHaveCount(13);
});

it('refuses to delete a role that is assigned to staff', function (): void {
    $role = Role::create(['name' => 'In Use', 'guard_name' => 'web']);
    $staff = User::factory()->staff()->create();
    $staff->assignRole($role);

    $this->deleteJson("/api/v1/admin/roles/{$role->id}")
        ->assertStatus(409)
        ->assertJsonPath('success', false);

    $this->assertDatabaseHas('roles', ['id' => $role->id]);
});

it('validates role names and permission names', function (): void {
    $this->postJson('/api/v1/admin/roles', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);

    $this->postJson('/api/v1/admin/roles', [
        'name' => 'Support',
        'permissions' => ['products.view'],
    ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

    $this->postJson('/api/v1/admin/roles', [
        'name' => 'Valid Name',
        'permissions' => ['not.a.real.permission'],
    ])->assertUnprocessable()->assertJsonValidationErrors(['permissions.0']);
});
