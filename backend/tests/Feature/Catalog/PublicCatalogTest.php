<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Support\Facades\Storage;

it('returns the active category tree and hides inactive categories', function (): void {
    $root = Category::factory()->create(['name' => 'Home', 'sort_order' => 1]);
    $child = Category::factory()->create(['name' => 'Lighting', 'parent_id' => $root->id, 'sort_order' => 2]);
    Category::factory()->create(['name' => 'Hidden', 'parent_id' => $root->id, 'is_active' => false]);
    Category::factory()->create(['name' => 'Inactive Root', 'is_active' => false]);

    $response = $this->getJson('/api/v1/categories')->assertOk();

    $response->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Home')
        ->assertJsonCount(1, 'data.0.children')
        ->assertJsonPath('data.0.children.0.name', 'Lighting');

    expect($response->json('data.0.children.0.id'))->toBe($child->id);
});

it('lists only active products in active categories', function (): void {
    $category = Category::factory()->create();
    $inactiveCategory = Category::factory()->create(['is_active' => false]);

    $visible = Product::factory()->create(['category_id' => $category->id, 'name' => 'Visible']);
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Inactive', 'is_active' => false]);
    Product::factory()->create(['category_id' => $inactiveCategory->id, 'name' => 'Hidden Category']);
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Deleted'])->delete();

    $response = $this->getJson('/api/v1/products')->assertOk();

    $response->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.name', 'Visible');

    expect($response->json('data.0.id'))->toBe($visible->id);
});

it('searches products by name, sku and description', function (): void {
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Alpine Lamp', 'sku' => 'LAMP-001']);
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Desk Chair', 'sku' => 'CHR-900', 'description' => '<p>Ergonomic mesh seat</p>']);

    expect($this->getJson('/api/v1/products?search=Alpine')->json('meta.pagination.total'))->toBe(1)
        ->and($this->getJson('/api/v1/products?search=LAMP-001')->json('meta.pagination.total'))->toBe(1)
        ->and($this->getJson('/api/v1/products?search=ergonomic')->json('meta.pagination.total'))->toBe(1);
});

it('filters by a category including its descendants', function (): void {
    $root = Category::factory()->create();
    $child = Category::factory()->create(['parent_id' => $root->id]);
    $grandchild = Category::factory()->create(['parent_id' => $child->id]);
    $other = Category::factory()->create();

    Product::factory()->create(['category_id' => $root->id, 'name' => 'Root Product']);
    Product::factory()->create(['category_id' => $grandchild->id, 'name' => 'Deep Product']);
    Product::factory()->create(['category_id' => $other->id, 'name' => 'Other Product']);

    $response = $this->getJson("/api/v1/products?category={$root->slug}")->assertOk();

    expect($response->json('meta.pagination.total'))->toBe(2);

    expect(collect($response->json('data'))->pluck('name')->all())
        ->toEqualCanonicalizing(['Root Product', 'Deep Product']);
});

it('filters by effective price range', function (): void {
    $category = Category::factory()->create();

    Product::factory()->create(['category_id' => $category->id, 'name' => 'Budget', 'price' => 5000, 'discount_price' => 2500]);
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Mid', 'price' => 5000]);
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Luxury', 'price' => 9000]);

    $response = $this->getJson('/api/v1/products?min_price=2000&max_price=6000')->assertOk();

    expect(collect($response->json('data'))->pluck('name')->all())
        ->toEqualCanonicalizing(['Budget', 'Mid']);
});

it('sorts by effective price and newest', function (): void {
    $category = Category::factory()->create();

    $cheap = Product::factory()->create(['category_id' => $category->id, 'name' => 'Cheap', 'price' => 1000]);
    $discounted = Product::factory()->create(['category_id' => $category->id, 'name' => 'Discounted', 'price' => 5000, 'discount_price' => 500]);
    $expensive = Product::factory()->create(['category_id' => $category->id, 'name' => 'Expensive', 'price' => 9000]);

    $cheap->forceFill(['created_at' => now()->subDays(2)])->save();
    $discounted->forceFill(['created_at' => now()->subDay()])->save();
    $expensive->forceFill(['created_at' => now()])->save();

    $asc = $this->getJson('/api/v1/products?sort=price_asc')->json('data');
    expect(collect($asc)->pluck('name')->all())->toBe(['Discounted', 'Cheap', 'Expensive']);

    $desc = $this->getJson('/api/v1/products?sort=price_desc')->json('data');
    expect(collect($desc)->pluck('name')->all())->toBe(['Expensive', 'Cheap', 'Discounted']);

    $newest = $this->getJson('/api/v1/products?sort=newest')->json('data');
    expect(collect($newest)->pluck('name')->all())->toBe(['Expensive', 'Discounted', 'Cheap']);
});

it('paginates the product list with metadata', function (): void {
    $category = Category::factory()->create();
    Product::factory()->count(15)->create(['category_id' => $category->id]);

    $response = $this->getJson('/api/v1/products?per_page=10&page=2')->assertOk();

    $response->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.pagination.current_page', 2)
        ->assertJsonPath('meta.pagination.per_page', 10)
        ->assertJsonPath('meta.pagination.total', 15)
        ->assertJsonPath('meta.pagination.last_page', 2);
});

it('returns a product detail with images, stock status and related products', function (): void {
    Storage::fake('public');

    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'Alpine Lamp',
        'stock' => 3,
    ]);
    $related = Product::factory()->create(['category_id' => $category->id, 'name' => 'Related Lamp']);
    Product::factory()->create(['name' => 'Other Product']);

    ProductImage::query()->create([
        'product_id' => $product->id,
        'path' => 'products/lamp.jpg',
        'alt' => 'Lamp',
        'is_primary' => true,
        'sort_order' => 0,
    ]);

    $response = $this->getJson("/api/v1/products/{$product->slug}")->assertOk();

    $response->assertJsonPath('data.name', 'Alpine Lamp')
        ->assertJsonPath('data.stock_status', 'low_stock')
        ->assertJsonPath('data.images.0.alt', 'Lamp')
        ->assertJsonPath('data.related.0.name', 'Related Lamp');

    expect($response->json('data.related'))->toHaveCount(1);
});

it('reports in-stock and out-of-stock states', function (): void {
    $category = Category::factory()->create();
    $inStock = Product::factory()->create(['category_id' => $category->id, 'stock' => 12]);
    $out = Product::factory()->create(['category_id' => $category->id, 'stock' => 0]);

    $this->getJson("/api/v1/products/{$inStock->slug}")
        ->assertOk()
        ->assertJsonPath('data.stock_status', 'in_stock');

    $this->getJson("/api/v1/products/{$out->slug}")
        ->assertOk()
        ->assertJsonPath('data.stock_status', 'out_of_stock');
});

it('hides an inactive product detail behind a 404', function (): void {
    $product = Product::factory()->create(['is_active' => false]);

    $this->getJson("/api/v1/products/{$product->slug}")->assertNotFound();
});

it('validates catalog list filters', function (): void {
    $this->getJson('/api/v1/products?per_page=500')->assertUnprocessable();
    $this->getJson('/api/v1/products?sort=sideways')->assertUnprocessable();
    $this->getJson('/api/v1/products?min_price=-1')->assertUnprocessable();
    $this->getJson('/api/v1/products?max_price=100&min_price=200')->assertUnprocessable();
    $this->getJson('/api/v1/products?category=does-not-exist')->assertNotFound();
});
