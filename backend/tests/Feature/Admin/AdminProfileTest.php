<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = actingAsSuperAdmin();
});

it('returns the authenticated staff profile', function (): void {
    $this->getJson('/api/v1/admin/profile')->assertOk()
        ->assertJsonPath('data.id', $this->admin->id)
        ->assertJsonPath('data.roles.0', 'Super Admin');
});

it('updates name, phone and email but ignores privileged fields', function (): void {
    $this->patchJson('/api/v1/admin/profile', [
        'name' => 'Renamed Admin',
        'phone' => '+1 555 999 0000',
        'email' => 'renamed@nocfinity.test',
        'type' => 'customer',
        'is_active' => false,
    ])->assertOk()
        ->assertJsonPath('data.name', 'Renamed Admin')
        ->assertJsonPath('data.email', 'renamed@nocfinity.test')
        ->assertJsonPath('data.type', 'staff')
        ->assertJsonPath('data.is_active', true);

    $this->admin->refresh();

    expect($this->admin->name)->toBe('Renamed Admin')
        ->and($this->admin->type->value)->toBe('staff')
        ->and($this->admin->is_active)->toBeTrue();
});

it('rejects an email already used by another account', function (): void {
    User::factory()->create(['email' => 'taken@nocfinity.test']);

    $this->patchJson('/api/v1/admin/profile', [
        'name' => 'Admin',
        'email' => 'taken@nocfinity.test',
    ])->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

it('rejects a password change with the wrong current password', function (): void {
    $this->postJson('/api/v1/admin/auth/change-password', [
        'current_password' => 'WrongPassword123!',
        'password' => 'NewStrongPass123!',
        'password_confirmation' => 'NewStrongPass123!',
    ])->assertStatus(422)
        ->assertJsonValidationErrors('current_password');
});

it('changes the password when the current one is correct', function (): void {
    $this->postJson('/api/v1/admin/auth/change-password', [
        'current_password' => 'Password123!',
        'password' => 'NewStrongPass123!',
        'password_confirmation' => 'NewStrongPass123!',
    ])->assertOk();

    expect(Hash::check('NewStrongPass123!', $this->admin->fresh()->password))->toBeTrue();
});

it('rejects customer tokens on the staff profile endpoint', function (): void {
    $customer = User::factory()->create();
    forgetAuthGuards();
    Sanctum::actingAs($customer, ['customer']);

    $this->getJson('/api/v1/admin/profile')->assertForbidden();
    $this->patchJson('/api/v1/admin/profile', ['name' => 'Nope'])->assertForbidden();
});
