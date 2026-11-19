<?php

use App\Models\Coupon;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = actingAsSuperAdmin();
});

it('lists coupons with search and pagination', function (): void {
    Coupon::factory()->create(['code' => 'SAVE10']);
    Coupon::factory()->create(['code' => 'WELCOME20']);

    $all = $this->getJson('/api/v1/admin/coupons')->assertOk();
    $all->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.pagination.total', 2)
        ->assertJsonPath('data.0.code', 'WELCOME20');

    $search = $this->getJson('/api/v1/admin/coupons?search=SAVE')->assertOk();
    $search->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.code', 'SAVE10');
});

it('creates a percentage coupon and uppercases the code', function (): void {
    $response = $this->postJson('/api/v1/admin/coupons', [
        'code' => 'save20',
        'type' => 'percentage',
        'value' => 20,
        'min_order_amount' => 1000,
        'max_discount_amount' => 500,
        'usage_limit' => 100,
        'per_user_limit' => 1,
        'starts_at' => now()->toDateString(),
        'expires_at' => now()->addMonth()->toDateString(),
        'is_active' => true,
    ])->assertCreated();

    $response->assertJsonPath('data.code', 'SAVE20')
        ->assertJsonPath('data.type', 'percentage')
        ->assertJsonPath('data.value', 20)
        ->assertJsonPath('data.used_count', 0);

    expect(Coupon::query()->where('code', 'SAVE20')->exists())->toBeTrue();
});

it('creates a fixed coupon in cents', function (): void {
    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'FLAT500',
        'type' => 'fixed',
        'value' => 500,
        'is_active' => true,
    ])->assertCreated()
        ->assertJsonPath('data.type', 'fixed')
        ->assertJsonPath('data.value', 500);
});

it('validates percentage, fixed value and expiry', function (): void {
    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'BADPCT',
        'type' => 'percentage',
        'value' => 101,
    ])->assertStatus(422);

    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'BADFIXED',
        'type' => 'fixed',
        'value' => 0,
    ])->assertStatus(422);

    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'BADEXPIRY',
        'type' => 'fixed',
        'value' => 100,
        'starts_at' => now()->addDays(5)->toDateString(),
        'expires_at' => now()->toDateString(),
    ])->assertStatus(422);
});

it('rejects a duplicate coupon code', function (): void {
    Coupon::factory()->create(['code' => 'TAKEN']);

    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'taken',
        'type' => 'fixed',
        'value' => 100,
    ])->assertStatus(422)
        ->assertJsonValidationErrors('code');
});

it('updates a coupon', function (): void {
    $coupon = Coupon::factory()->create([
        'code' => 'OLD10',
        'type' => 'percentage',
        'value' => 10,
    ]);

    $this->patchJson('/api/v1/admin/coupons/'.$coupon->id, [
        'code' => 'NEW15',
        'type' => 'percentage',
        'value' => 15,
        'min_order_amount' => 0,
        'is_active' => false,
    ])->assertOk()
        ->assertJsonPath('data.code', 'NEW15')
        ->assertJsonPath('data.value', 15)
        ->assertJsonPath('data.is_active', false);
});

it('soft deletes a coupon', function (): void {
    $coupon = Coupon::factory()->create();

    $this->deleteJson('/api/v1/admin/coupons/'.$coupon->id)->assertNoContent();

    $this->assertSoftDeleted('coupons', ['id' => $coupon->id]);
    $this->getJson('/api/v1/admin/coupons/'.$coupon->id)->assertNotFound();
});

it('denies coupon access without the manage permission', function (): void {
    $staff = User::factory()->staff()->create();
    $staff->assignRole('Support');
    forgetAuthGuards();
    Sanctum::actingAs($staff, ['staff']);

    $this->getJson('/api/v1/admin/coupons')->assertForbidden();
    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'NOPE',
        'type' => 'fixed',
        'value' => 100,
    ])->assertForbidden();
});
