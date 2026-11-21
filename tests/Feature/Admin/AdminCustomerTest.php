<?php

use App\Enums\OrderStatus;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = actingAsSuperAdmin();

    $this->alice = User::factory()->create(['name' => 'Alice Anderson']);
    $this->bob = User::factory()->create(['name' => 'Bob Brown']);
    User::factory()->create(['name' => 'Cara Clark']);

    makeOrderFor($this->alice, OrderStatus::Paid, ['grand_total' => 5000]);
    makeOrderFor($this->alice, OrderStatus::Pending, ['grand_total' => 1000]);
    makeOrderFor($this->bob, OrderStatus::Paid, ['grand_total' => 2000]);
});

it('lists only customers with order counts and paid totals', function (): void {
    $response = $this->getJson('/api/v1/admin/customers')->assertOk();

    $response->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.pagination.total', 3);

    $alice = collect($response->json('data'))->firstWhere('id', $this->alice->id);
    expect($alice['orders_count'])->toBe(2)
        ->and($alice['total_spent'])->toBe(5000);
});

it('searches customers by name or email', function (): void {
    $search = $this->getJson('/api/v1/admin/customers?search=Alice')->assertOk();

    $search->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->alice->id);
});

it('shows a customer with order history', function (): void {
    $response = $this->getJson('/api/v1/admin/customers/'.$this->alice->id)->assertOk();

    $response->assertJsonPath('data.id', $this->alice->id)
        ->assertJsonPath('data.orders_count', 2)
        ->assertJsonPath('data.total_spent', 5000)
        ->assertJsonCount(2, 'data.orders');
});

it('returns 404 for a staff id on the customer endpoint', function (): void {
    $staff = User::factory()->staff()->create();

    $this->getJson('/api/v1/admin/customers/'.$staff->id)->assertNotFound();
});

it('denies customer access without the customers.view permission', function (): void {
    $staff = User::factory()->staff()->create();
    $staff->assignRole('Product Manager');
    forgetAuthGuards();
    Sanctum::actingAs($staff, ['staff']);

    $this->getJson('/api/v1/admin/customers')->assertForbidden();
    $this->getJson('/api/v1/admin/customers/'.$this->alice->id)->assertForbidden();
});
