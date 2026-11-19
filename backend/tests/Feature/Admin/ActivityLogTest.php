<?php

use App\Enums\OrderStatus;
use App\Models\ActivityLog;
use App\Models\Coupon;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = actingAsSuperAdmin();
    $this->customer = User::factory()->create();
});

it('records order status, coupon and profile actions', function (): void {
    $order = makeOrderFor($this->customer, OrderStatus::Paid);

    $this->patchJson('/api/v1/admin/orders/'.$order->id.'/status', [
        'status' => 'processing',
    ])->assertOk();

    $coupon = Coupon::factory()->create();

    $this->patchJson('/api/v1/admin/coupons/'.$coupon->id, [
        'code' => $coupon->code,
        'type' => 'percentage',
        'value' => 12,
    ])->assertOk();

    $this->patchJson('/api/v1/admin/profile', ['name' => 'Audited Admin'])->assertOk();

    expect(ActivityLog::query()->where('action', 'order.status_updated')->exists())->toBeTrue()
        ->and(ActivityLog::query()->where('action', 'coupon.updated')->exists())->toBeTrue()
        ->and(ActivityLog::query()->where('action', 'profile.updated')->exists())->toBeTrue();

    $log = ActivityLog::query()->where('action', 'order.status_updated')->firstOrFail();

    expect($log->user_id)->toBe($this->admin->id)
        ->and($log->subject_id)->toBe($order->id)
        ->and($log->properties['to'])->toBe('processing');
});

it('lists activity logs with filters', function (): void {
    ActivityLog::query()->create([
        'user_id' => $this->admin->id,
        'action' => 'order.status_updated',
        'description' => 'Order moved.',
    ]);
    ActivityLog::query()->create([
        'user_id' => $this->admin->id,
        'action' => 'coupon.created',
        'description' => 'Coupon created.',
    ]);

    $response = $this->getJson('/api/v1/admin/activity-logs')->assertOk();

    $response->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.pagination.total', 2);

    $filtered = $this->getJson('/api/v1/admin/activity-logs?action=coupon.created')->assertOk();
    $filtered->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.action', 'coupon.created');
});

it('restricts the activity log to roles.manage', function (): void {
    $staff = User::factory()->staff()->create();
    $staff->assignRole('Admin');
    forgetAuthGuards();
    Sanctum::actingAs($staff, ['staff']);

    $this->getJson('/api/v1/admin/activity-logs')->assertForbidden();
});
