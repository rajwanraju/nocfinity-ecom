<?php

use App\Enums\OrderStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = actingAsSuperAdmin();

    $this->customer = User::factory()->create();
    $this->order = makeOrderFor($this->customer, OrderStatus::Paid);
});

it('lists orders with status filter and search', function (): void {
    makeOrderFor($this->customer, OrderStatus::Pending);

    $all = $this->getJson('/api/v1/admin/orders')->assertOk();
    $all->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.pagination.total', 2);

    $paid = $this->getJson('/api/v1/admin/orders?status=paid')->assertOk();
    $paid->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->order->id);

    $search = $this->getJson('/api/v1/admin/orders?search='.$this->order->order_number)->assertOk();
    $search->assertJsonCount(1, 'data');
});

it('shows order detail with items, payment, timeline and valid transitions', function (): void {
    $response = $this->getJson('/api/v1/admin/orders/'.$this->order->id)->assertOk();

    $response->assertJsonPath('data.id', $this->order->id)
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonPath('data.payment_status', 'succeeded')
        ->assertJsonPath('data.customer.email', $this->customer->email)
        ->assertJsonCount(1, 'data.items')
        ->assertJsonCount(1, 'data.status_history')
        ->assertJsonPath('data.valid_transitions', ['processing', 'cancelled']);
});

it('returns 404 for a missing order', function (): void {
    $this->getJson('/api/v1/admin/orders/999999')->assertNotFound();
});

it('updates order status and records history', function (): void {
    $response = $this->patchJson('/api/v1/admin/orders/'.$this->order->id.'/status', [
        'status' => 'processing',
        'note' => 'Picked and packed.',
    ])->assertOk();

    $response->assertJsonPath('data.status', 'processing');

    $this->order->refresh();

    expect($this->order->status)->toBe(OrderStatus::Processing)
        ->and($this->order->statusHistories()->count())->toBe(2);

    $history = $this->order->statusHistories()->latest('id')->first();
    expect($history->note)->toBe('Picked and packed.')
        ->and($history->changed_by)->toBe($this->admin->id);
});

it('rejects an invalid status transition with 409', function (): void {
    $this->patchJson('/api/v1/admin/orders/'.$this->order->id.'/status', [
        'status' => 'shipped',
    ])->assertStatus(409);
});

it('rejects an unknown status value with 422', function (): void {
    $this->patchJson('/api/v1/admin/orders/'.$this->order->id.'/status', [
        'status' => 'exploded',
    ])->assertStatus(422);
});

it('denies order updates without the update_status permission', function (): void {
    $staff = User::factory()->staff()->create();
    $staff->assignRole('Support');
    forgetAuthGuards();
    Sanctum::actingAs($staff, ['staff']);

    // Support may view orders...
    $this->getJson('/api/v1/admin/orders')->assertOk();

    // ...but not change their status.
    $this->patchJson('/api/v1/admin/orders/'.$this->order->id.'/status', [
        'status' => 'processing',
    ])->assertForbidden();
});

it('denies order viewing without the orders.view permission', function (): void {
    $staff = User::factory()->staff()->create();
    $staff->assignRole('Product Manager');
    forgetAuthGuards();
    Sanctum::actingAs($staff, ['staff']);

    $this->getJson('/api/v1/admin/orders')->assertForbidden();
    $this->getJson('/api/v1/admin/orders/'.$this->order->id)->assertForbidden();
});

it('requires the cancel permission to cancel an order', function (): void {
    $role = Role::findOrCreate('Status Only', 'web');
    $role->syncPermissions(['orders.view', 'orders.update_status']);

    $staff = User::factory()->staff()->create();
    $staff->assignRole($role);
    forgetAuthGuards();
    Sanctum::actingAs($staff, ['staff']);

    $this->patchJson('/api/v1/admin/orders/'.$this->order->id.'/status', [
        'status' => 'cancelled',
    ])->assertForbidden();

    expect($this->order->fresh()->status)->toBe(OrderStatus::Paid);
});

it('rejects customer tokens on admin order endpoints', function (): void {
    forgetAuthGuards();
    Sanctum::actingAs($this->customer, ['customer']);

    $this->getJson('/api/v1/admin/orders')->assertForbidden();
});
