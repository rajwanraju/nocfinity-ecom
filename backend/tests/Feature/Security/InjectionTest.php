<?php

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Support\Stripe\StripeGateway;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakeStripeGateway;

/*
|--------------------------------------------------------------------------
| SEC-3, SEC-4: injection and XSS payloads
|--------------------------------------------------------------------------
*/

it('keeps HTML payloads inert in customer names and order addresses', function (): void {
    $namePayload = '<script>alert("xss")</script> Mallory';
    $linePayload = '<img src=x onerror=alert(1)>';
    $notePayload = '<svg onload=alert(1)>';

    $registered = $this->postJson('/api/v1/auth/register', [
        'name' => $namePayload,
        'email' => 'xss@example.test',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
    ])->assertCreated();

    // The API only ever returns JSON; the payload is data, not markup.
    expect($registered->headers->get('content-type'))->toContain('application/json')
        ->and($registered->json('data.user.name'))->toBe($namePayload)
        ->and(User::query()->where('email', 'xss@example.test')->value('name'))->toBe($namePayload);

    $customer = User::query()->where('email', 'xss@example.test')->firstOrFail();
    $product = Product::factory()->create(['price' => 2000, 'stock' => 5]);

    Sanctum::actingAs($customer, ['customer']);
    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    $this->instance(StripeGateway::class, new FakeStripeGateway);

    $checkout = $this->postJson('/api/v1/checkout', checkoutAddress([
        'shipping_name' => $linePayload,
        'shipping_line1' => $linePayload,
        'notes' => $notePayload,
    ]))->assertCreated();

    expect($checkout->json('data.order.shipping.name'))->toBe($linePayload)
        ->and($checkout->json('data.order.shipping.line1'))->toBe($linePayload)
        ->and($checkout->json('data.order.notes'))->toBe($notePayload);
});

it('sanitizes HTML in admin product descriptions', function (): void {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $category = Category::factory()->create();

    $response = $this->postJson('/api/v1/admin/products', [
        'category_id' => $category->id,
        'name' => 'XSS product',
        'sku' => 'XSS-0001',
        'price' => 1000,
        'stock' => 2,
        'description' => '<p>Safe copy</p><script>alert(1)</script><img src=x onerror=alert(1)>',
    ])->assertCreated();

    $description = (string) $response->json('data.description');

    expect($description)->toContain('Safe copy')
        ->not->toContain('<script')
        ->not->toContain('onerror');
});

it('treats SQL payloads in public search and filters as data', function (): void {
    $category = Category::factory()->create();
    Product::factory()->create(['name' => 'Real product', 'category_id' => $category->id]);

    $this->getJson('/api/v1/products?search='.urlencode("' OR 1=1 --"))
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 0);

    // An unknown category slug is a 404, never an unbounded result set.
    $this->getJson('/api/v1/products?category='.urlencode("' OR '1'='1"))
        ->assertNotFound();

    $this->getJson('/api/v1/products?sort='.urlencode('price_asc; DROP TABLE products'))
        ->assertUnprocessable();

    $this->getJson('/api/v1/products?min_price='.urlencode('1 OR 1=1'))
        ->assertUnprocessable();

    // Nothing was dropped or leaked: the table and the single row survive.
    expect(Product::query()->count())->toBe(1);
});

it('treats SQL payloads in admin search and filters as data', function (): void {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $customer = User::factory()->create(['name' => 'Real Customer']);
    makeOrderFor($customer, OrderStatus::Paid);

    $this->getJson('/api/v1/admin/orders?search='.urlencode("' OR 1=1 --"))
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 0);

    $this->getJson('/api/v1/admin/customers?search='.urlencode("' OR 1=1 --"))
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 0);

    $this->getJson('/api/v1/admin/orders?status='.urlencode("paid' OR '1'='1"))
        ->assertUnprocessable();
});
