<?php

use App\Enums\OrderStatus;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = actingAsSuperAdmin();
});

it('returns dashboard counters, a 30-day series and recent orders', function (): void {
    $customers = User::factory()->count(3)->create();

    $todayPaid = makeOrderFor($customers[0], overrides: ['grand_total' => 5000]);
    $pending = makeOrderFor($customers[1], OrderStatus::Pending, ['grand_total' => 1500]);

    $yesterday = makeOrderFor($customers[2], overrides: ['grand_total' => 8000]);
    $yesterday->forceFill(['created_at' => now()->subDay(), 'paid_at' => now()->subDay()])->save();
    $todayPaid->forceFill(['created_at' => now()->subHours(2)])->save();
    $pending->forceFill(['created_at' => now()->subHour()])->save();

    Product::factory()->create(['stock' => 2, 'is_active' => true]);
    Product::factory()->create(['stock' => 5, 'is_active' => true]);
    Product::factory()->create(['stock' => 6, 'is_active' => true]);
    Product::factory()->create(['stock' => 1, 'is_active' => false]);

    $response = $this->getJson('/api/v1/admin/dashboard')->assertOk();

    $response->assertJsonPath('success', true)
        ->assertJsonPath('data.today_orders', 2)
        ->assertJsonPath('data.today_revenue', 5000)
        ->assertJsonPath('data.total_customers', 3)
        ->assertJsonPath('data.low_stock_count', 2)
        ->assertJsonPath('data.recent_orders.0.id', $pending->id)
        ->assertJsonPath('data.recent_orders.2.id', $yesterday->id)
        ->assertJsonCount(3, 'data.recent_orders')
        ->assertJsonCount(30, 'data.sales_series')
        ->assertJsonPath('data.sales_series.29.date', now()->toDateString())
        ->assertJsonPath('data.sales_series.29.revenue', 5000);

    expect($todayPaid->status->isPaid())->toBeTrue();
});

it('denies dashboard access without the reports permission', function (): void {
    $staff = User::factory()->staff()->create();
    $staff->assignRole('Support');
    Sanctum::actingAs($staff, ['staff']);

    $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
});
