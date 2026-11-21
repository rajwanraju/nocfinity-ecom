<?php

use App\Enums\OrderStatus;
use App\Models\Coupon;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);

    $this->customer = User::factory()->create();
    $this->order = makeOrderFor($this->customer, OrderStatus::Paid);
    $this->coupon = Coupon::factory()->create();

    $this->endpoints = [
        ['get', '/api/v1/admin/dashboard'],
        ['get', '/api/v1/admin/activity-logs'],
        ['get', '/api/v1/admin/orders'],
        ['get', '/api/v1/admin/orders/'.$this->order->id],
        ['patch', '/api/v1/admin/orders/'.$this->order->id.'/status'],
        ['get', '/api/v1/admin/coupons'],
        ['post', '/api/v1/admin/coupons'],
        ['get', '/api/v1/admin/coupons/'.$this->coupon->id],
        ['patch', '/api/v1/admin/coupons/'.$this->coupon->id],
        ['delete', '/api/v1/admin/coupons/'.$this->coupon->id],
        ['get', '/api/v1/admin/customers'],
        ['get', '/api/v1/admin/customers/'.$this->customer->id],
    ];
});

it('rejects every protected admin endpoint without a staff token', function (): void {
    foreach ($this->endpoints as [$method, $uri]) {
        $this->json($method, $uri)->assertUnauthorized();
    }
});

it('rejects every protected admin endpoint for customer tokens', function (): void {
    Sanctum::actingAs($this->customer, ['customer']);

    foreach ($this->endpoints as [$method, $uri]) {
        $this->json($method, $uri)->assertForbidden();
    }
});

it('rejects every protected admin endpoint for staff without permissions', function (): void {
    $staff = User::factory()->staff()->create();
    Sanctum::actingAs($staff, ['staff']);

    foreach ($this->endpoints as [$method, $uri]) {
        $this->json($method, $uri)->assertForbidden();
    }
});

it('lets any staff member read and update their own profile', function (): void {
    $staff = User::factory()->staff()->create();
    Sanctum::actingAs($staff, ['staff']);

    $this->getJson('/api/v1/admin/profile')->assertOk();
    $this->patchJson('/api/v1/admin/profile', ['name' => 'No Role Staff'])->assertOk();
});
