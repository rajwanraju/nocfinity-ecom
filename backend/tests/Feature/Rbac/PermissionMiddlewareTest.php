<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
});

dataset('role access', [
    'Super Admin' => ['Super Admin', 200, 200],
    'Admin' => ['Admin', 403, 200],
    'Product Manager' => ['Product Manager', 403, 403],
    'Order Manager' => ['Order Manager', 403, 403],
    'Support' => ['Support', 403, 403],
]);

it('applies the role permission matrix to admin endpoints', function (string $role, int $rolesStatus, int $staffStatus): void {
    $user = User::factory()->staff()->create();
    $user->assignRole($role);
    Sanctum::actingAs($user, ['staff']);

    $this->getJson('/api/v1/admin/roles')->assertStatus($rolesStatus);
    $this->getJson('/api/v1/admin/staff')->assertStatus($staffStatus);
})->with('role access');

it('lets the super admin bypass every gate check', function (): void {
    $superAdmin = User::factory()->staff()->create();
    $superAdmin->assignRole('Super Admin');

    $support = User::factory()->staff()->create();
    $support->assignRole('Support');

    expect($superAdmin->can('roles.manage'))->toBeTrue()
        ->and($superAdmin->can('anything.at.all'))->toBeTrue()
        ->and($support->can('roles.manage'))->toBeFalse()
        ->and($support->can('orders.view'))->toBeTrue();
});

it('returns the union of permissions for staff with multiple roles', function (): void {
    $staff = User::factory()->staff()->create(['password' => 'StrongPass123!']);
    $staff->assignRole(['Product Manager', 'Support']);

    Sanctum::actingAs($staff, ['staff']);

    $response = $this->getJson('/api/v1/admin/auth/me')->assertOk();

    $permissions = $response->json('data.permissions');

    expect($permissions)
        ->toContain('products.create')
        ->toContain('orders.view')
        ->toContain('customers.view')
        ->not->toContain('roles.manage')
        ->not->toContain('staff.manage');

    expect($response->json('data.roles'))->toEqualCanonicalizing(['Product Manager', 'Support']);
});

it('rejects customer tokens on admin rbac endpoints', function (): void {
    $customer = User::factory()->create();
    Sanctum::actingAs($customer, ['customer']);

    $this->getJson('/api/v1/admin/roles')->assertForbidden();
    $this->getJson('/api/v1/admin/permissions')->assertForbidden();
    $this->getJson('/api/v1/admin/staff')->assertForbidden();
});

it('rejects unauthenticated requests on admin rbac endpoints', function (): void {
    $this->getJson('/api/v1/admin/roles')->assertUnauthorized();
    $this->getJson('/api/v1/admin/staff')->assertUnauthorized();
});
