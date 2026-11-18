<?php

use App\Models\Cart;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('creates a guest cart and computes every total on the server', function (): void {
    $product = Product::factory()->create(['price' => 2000, 'discount_price' => null, 'stock' => 10]);

    $response = $this->postJson('/api/v1/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
        // A tampered client price must never reach the totals (SEC-1).
        'price' => 1,
        'unit_price' => 1,
        'subtotal' => 1,
        'total' => 1,
    ])->assertOk();

    $token = $response->json('meta.cart_token');

    expect($token)->toBeString()->not->toBeEmpty();

    $response->assertCookie('cart_token')
        ->assertJsonPath('data.items.0.unit_price', 2000)
        ->assertJsonPath('data.items.0.line_total', 2000)
        ->assertJsonPath('data.totals.subtotal', 2000)
        ->assertJsonPath('data.totals.discount', 0)
        ->assertJsonPath('data.totals.shipping', 999)
        ->assertJsonPath('data.totals.tax', 0)
        ->assertJsonPath('data.totals.total', 2999);

    $this->withHeader('X-Cart-Token', $token)
        ->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonPath('data.items.0.quantity', 1)
        ->assertJsonPath('data.totals.total', 2999);
});

it('uses the discounted effective price and applies free shipping above the threshold', function (): void {
    $product = Product::factory()->create(['price' => 12000, 'discount_price' => 9000, 'stock' => 10]);

    $response = $this->postJson('/api/v1/cart/items', [
        'product_id' => $product->id,
        'quantity' => 2,
    ])->assertOk();

    $response->assertJsonPath('data.items.0.unit_price', 9000)
        ->assertJsonPath('data.totals.subtotal', 18000)
        ->assertJsonPath('data.totals.shipping', 0)
        ->assertJsonPath('data.totals.total', 18000);
});

it('rejects out of stock and inactive products', function (): void {
    $outOfStock = Product::factory()->create(['stock' => 0]);
    $inactive = Product::factory()->create(['stock' => 5, 'is_active' => false]);
    $inactiveCategory = Product::factory()->create([
        'stock' => 5,
        'category_id' => Category::factory()->create(['is_active' => false])->id,
    ]);

    $this->postJson('/api/v1/cart/items', ['product_id' => $outOfStock->id, 'quantity' => 1])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('quantity');

    $this->postJson('/api/v1/cart/items', ['product_id' => $inactive->id, 'quantity' => 1])
        ->assertUnprocessable();

    $this->postJson('/api/v1/cart/items', ['product_id' => $inactiveCategory->id, 'quantity' => 1])
        ->assertUnprocessable();
});

it('caps quantities at the available stock and the per-line limit', function (): void {
    $scarce = Product::factory()->create(['price' => 1000, 'stock' => 3]);
    $plenty = Product::factory()->create(['price' => 1000, 'stock' => 50]);

    $this->postJson('/api/v1/cart/items', ['product_id' => $scarce->id, 'quantity' => 4])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('quantity');

    $scarceCart = $this->postJson('/api/v1/cart/items', ['product_id' => $scarce->id, 'quantity' => 3])
        ->assertOk();
    $scarceToken = $scarceCart->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $scarceToken)
        ->postJson('/api/v1/cart/items', ['product_id' => $scarce->id, 'quantity' => 1])
        ->assertUnprocessable();

    $plentyCart = $this->postJson('/api/v1/cart/items', ['product_id' => $plenty->id, 'quantity' => 10])
        ->assertOk();
    $plentyToken = $plentyCart->json('meta.cart_token');

    // Default per-line cap is 10, even when stock is 50.
    $this->withHeader('X-Cart-Token', $plentyToken)
        ->postJson('/api/v1/cart/items', ['product_id' => $plenty->id, 'quantity' => 1])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('quantity');
});

it('updates, removes and clears cart lines', function (): void {
    $product = Product::factory()->create(['price' => 1000, 'stock' => 10]);

    $add = $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    $token = $add->json('meta.cart_token');
    $itemId = $add->json('data.items.0.id');

    $this->withHeader('X-Cart-Token', $token)
        ->patchJson("/api/v1/cart/items/{$itemId}", ['quantity' => 4])
        ->assertOk()
        ->assertJsonPath('data.items.0.quantity', 4)
        ->assertJsonPath('data.totals.subtotal', 4000);

    $this->withHeader('X-Cart-Token', $token)
        ->patchJson("/api/v1/cart/items/{$itemId}", ['quantity' => 0])
        ->assertUnprocessable();

    $this->withHeader('X-Cart-Token', $token)
        ->deleteJson("/api/v1/cart/items/{$itemId}")
        ->assertNoContent();

    $this->withHeader('X-Cart-Token', $token)
        ->getJson('/api/v1/cart')
        ->assertJsonCount(0, 'data.items');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 2])
        ->assertOk();

    $this->withHeader('X-Cart-Token', $token)
        ->deleteJson('/api/v1/cart')
        ->assertNoContent();

    $this->withHeader('X-Cart-Token', $token)
        ->getJson('/api/v1/cart')
        ->assertJsonCount(0, 'data.items')
        ->assertJsonPath('data.totals.total', 0);
});

it('flags items whose product changed, sold out or was deactivated', function (): void {
    $product = Product::factory()->create(['price' => 1000, 'stock' => 5]);

    $add = $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 5])->assertOk();
    $token = $add->json('meta.cart_token');

    // The price snapshot is kept so the client can be warned, but totals use
    // the current price.
    $product->forceFill(['price' => 1500])->save();

    $response = $this->withHeader('X-Cart-Token', $token)->getJson('/api/v1/cart')->assertOk();

    expect($response->json('data.items.0.warnings'))->toContain('price_changed');
    $response->assertJsonPath('data.items.0.unit_price', 1000)
        ->assertJsonPath('data.items.0.current_unit_price', 1500)
        ->assertJsonPath('data.items.0.line_total', 7500)
        ->assertJsonPath('data.totals.subtotal', 7500);

    $product->forceFill(['stock' => 2])->save();

    $response = $this->withHeader('X-Cart-Token', $token)->getJson('/api/v1/cart')->assertOk();
    expect($response->json('data.items.0.warnings'))->toContain('insufficient_stock');

    $product->forceFill(['stock' => 0])->save();

    $response = $this->withHeader('X-Cart-Token', $token)->getJson('/api/v1/cart')->assertOk();
    expect($response->json('data.items.0.warnings'))->toContain('out_of_stock');
    $response->assertJsonPath('data.items.0.is_available', false)
        ->assertJsonPath('data.totals.subtotal', 0)
        ->assertJsonPath('data.totals.total', 0);

    $product->forceFill(['stock' => 5, 'is_active' => false])->save();

    $response = $this->withHeader('X-Cart-Token', $token)->getJson('/api/v1/cart')->assertOk();
    expect($response->json('data.items.0.warnings'))->toContain('product_inactive');
    $response->assertJsonPath('data.items.0.is_available', false);
});

it('never lets one customer touch another cart', function (): void {
    $product = Product::factory()->create(['price' => 1000, 'stock' => 10]);

    $owner = User::factory()->create();
    Sanctum::actingAs($owner, ['customer']);

    $add = $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
    $itemId = $add->json('data.items.0.id');

    forgetAuthGuards();
    Sanctum::actingAs(User::factory()->create(), ['customer']);

    $this->patchJson("/api/v1/cart/items/{$itemId}", ['quantity' => 2])->assertNotFound();
    $this->deleteJson("/api/v1/cart/items/{$itemId}")->assertNotFound();
    $this->getJson('/api/v1/cart')->assertOk()->assertJsonCount(0, 'data.items');

    // The owner's line is untouched.
    expect(Cart::query()->find($add->json('data.id'))->items()->count())->toBe(1);
});

it('rejects staff tokens on customer cart endpoints', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create(), ['staff']);

    $this->getJson('/api/v1/cart')->assertForbidden();
});
