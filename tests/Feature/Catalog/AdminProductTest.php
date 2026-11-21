<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();
});

it('creates a product with a generated slug and sanitized description', function (): void {
    $category = Category::factory()->create();

    $response = $this->postJson('/api/v1/admin/products', [
        'category_id' => $category->id,
        'name' => 'Alpine Table Lamp',
        'sku' => 'LAMP-ALP-01',
        'description' => '<p>Soft light</p><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">bad</a>',
        'price' => 12900,
        'discount_price' => 9900,
        'stock' => 8,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Alpine Table Lamp')
        ->assertJsonPath('data.slug', 'alpine-table-lamp')
        ->assertJsonPath('data.price', 12900)
        ->assertJsonPath('data.discount_price', 9900)
        ->assertJsonPath('data.current_price', 9900)
        ->assertJsonPath('data.has_discount', true)
        ->assertJsonPath('data.stock_status', 'in_stock');

    $description = Product::query()->firstOrFail()->description;

    expect($description)->toContain('Soft light')
        ->not->toContain('<script')
        ->not->toContain('onerror')
        ->not->toContain('javascript:');

    expect($response->json('data.description'))->not->toContain('<script');
});

it('validates product input including discount and sku uniqueness', function (): void {
    $category = Category::factory()->create();
    Product::factory()->create(['sku' => 'TAKEN-1']);

    $this->postJson('/api/v1/admin/products', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category_id', 'name', 'sku', 'price', 'stock']);

    $this->postJson('/api/v1/admin/products', [
        'category_id' => $category->id,
        'name' => 'Bad Discount',
        'sku' => 'NEW-1',
        'price' => 1000,
        'discount_price' => 1000,
        'stock' => 1,
    ])->assertUnprocessable()->assertJsonValidationErrors(['discount_price']);

    $this->postJson('/api/v1/admin/products', [
        'category_id' => $category->id,
        'name' => 'Duplicate Sku',
        'sku' => 'TAKEN-1',
        'price' => 1000,
        'stock' => 1,
    ])->assertUnprocessable()->assertJsonValidationErrors(['sku']);

    $this->postJson('/api/v1/admin/products', [
        'category_id' => 999999,
        'name' => 'Bad Category',
        'sku' => 'NEW-2',
        'price' => 1000,
        'stock' => 1,
    ])->assertUnprocessable()->assertJsonValidationErrors(['category_id']);
});

it('refuses to lower a price below the existing discount', function (): void {
    $product = Product::factory()->create(['price' => 5000, 'discount_price' => 4000]);

    $this->patchJson("/api/v1/admin/products/{$product->id}", [
        'price' => 3500,
    ])->assertUnprocessable()->assertJsonValidationErrors(['discount_price']);

    expect($product->fresh()->price)->toBe(5000);
});

it('updates a product', function (): void {
    $product = Product::factory()->create(['name' => 'Old Name']);

    $this->patchJson("/api/v1/admin/products/{$product->id}", [
        'name' => 'New Name',
        'price' => 7500,
        'stock' => 0,
        'is_active' => false,
    ])->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.stock_status', 'out_of_stock')
        ->assertJsonPath('data.is_active', false);
});

it('lists products for admins including inactive ones', function (): void {
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Active Product']);
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Inactive Product', 'is_active' => false]);

    $response = $this->getJson('/api/v1/admin/products')->assertOk();

    $response->assertJsonPath('meta.pagination.total', 2);

    expect(collect($response->json('data'))->pluck('name')->all())
        ->toEqualCanonicalizing(['Active Product', 'Inactive Product']);

    $filtered = $this->getJson('/api/v1/admin/products?status=inactive')->assertOk();
    expect($filtered->json('meta.pagination.total'))->toBe(1)
        ->and($filtered->json('data.0.name'))->toBe('Inactive Product');
});

it('soft deletes a product and removes its image files', function (): void {
    Storage::fake('public');

    $product = Product::factory()->create();
    Storage::disk('public')->put('products/lamp.jpg', 'binary');

    ProductImage::query()->create([
        'product_id' => $product->id,
        'path' => 'products/lamp.jpg',
        'is_primary' => true,
        'sort_order' => 0,
    ]);

    $this->deleteJson("/api/v1/admin/products/{$product->id}")->assertNoContent();

    $this->assertSoftDeleted('products', ['id' => $product->id]);
    Storage::disk('public')->assertMissing('products/lamp.jpg');
});

it('enforces product permissions by role', function (): void {
    $support = User::factory()->staff()->create();
    $support->assignRole('Support');
    Sanctum::actingAs($support, ['staff']);

    $this->getJson('/api/v1/admin/products')->assertForbidden();

    $manager = User::factory()->staff()->create();
    $manager->assignRole('Product Manager');
    Sanctum::actingAs($manager, ['staff']);

    $this->getJson('/api/v1/admin/products')->assertOk();
    $this->postJson('/api/v1/admin/products', [])->assertUnprocessable();
});
