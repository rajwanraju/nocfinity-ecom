<?php

use App\Models\Cart;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

/**
 * Adds one product line to a fresh guest cart and returns [token, response].
 *
 * @return array{0: string, 1: TestResponse}
 */
function guestCartWith(Product $product, int $quantity = 1): array
{
    $response = test()->postJson('/api/v1/cart/items', [
        'product_id' => $product->id,
        'quantity' => $quantity,
    ])->assertOk();

    return [$response->json('meta.cart_token'), $response];
}

it('applies a percentage coupon and caps the discount', function (): void {
    $product = Product::factory()->create(['price' => 10000, 'stock' => 10]);
    $coupon = Coupon::factory()->create([
        'code' => 'TENOFF',
        'type' => 'percentage',
        'value' => 10,
        'max_discount_amount' => 500,
    ]);

    [$token] = guestCartWith($product);

    $response = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'tenoff'])
        ->assertOk()
        ->assertJsonPath('data.coupon.code', 'TENOFF')
        ->assertJsonPath('data.totals.discount', 500);

    expect($response->json('data.totals.subtotal'))->toBe(10000);
});

it('applies a fixed coupon without letting it exceed the subtotal', function (): void {
    $product = Product::factory()->create(['price' => 3000, 'stock' => 10]);
    Coupon::factory()->create(['code' => 'BIG', 'type' => 'fixed', 'value' => 5000]);

    [$token] = guestCartWith($product);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'BIG'])
        ->assertOk()
        ->assertJsonPath('data.totals.discount', 3000)
        ->assertJsonPath('data.totals.shipping', 999)
        ->assertJsonPath('data.totals.total', 999);
});

it('recalculates shipping and tax after the discount', function (): void {
    $product = Product::factory()->create(['price' => 12000, 'stock' => 10]);
    Coupon::factory()->create(['code' => 'TEN', 'type' => 'percentage', 'value' => 10]);

    [$token] = guestCartWith($product);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'TEN'])
        ->assertOk()
        ->assertJsonPath('data.totals.subtotal', 12000)
        ->assertJsonPath('data.totals.discount', 1200)
        ->assertJsonPath('data.totals.shipping', 0)
        ->assertJsonPath('data.totals.total', 10800);
});

it('rejects coupons that are expired, inactive or not started', function (): void {
    $product = Product::factory()->create(['price' => 9000, 'stock' => 10]);
    [$token] = guestCartWith($product);

    Coupon::factory()->create(['code' => 'OLD', 'expires_at' => now()->subDay()]);
    Coupon::factory()->create(['code' => 'OFF', 'is_active' => false]);
    Coupon::factory()->create(['code' => 'SOON', 'starts_at' => now()->addDay()]);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'OLD'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'This coupon has expired.');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'OFF'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'This coupon is inactive.');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'SOON'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'This coupon is not valid yet.');
});

it('rejects a coupon below its minimum order amount', function (): void {
    $product = Product::factory()->create(['price' => 2000, 'stock' => 10]);
    Coupon::factory()->create(['code' => 'MIN50', 'min_order_amount' => 5000]);

    [$token] = guestCartWith($product);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'MIN50'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'This coupon requires a minimum order of $50.00.');
});

it('rejects a coupon that reached its total usage limit', function (): void {
    $product = Product::factory()->create(['price' => 9000, 'stock' => 10]);
    Coupon::factory()->create(['code' => 'USED', 'usage_limit' => 2, 'used_count' => 2]);

    [$token] = guestCartWith($product);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'USED'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'This coupon has reached its usage limit.');
});

it('rejects a coupon the customer already used up to the per-user limit', function (): void {
    $product = Product::factory()->create(['price' => 9000, 'stock' => 10]);
    $coupon = Coupon::factory()->create(['code' => 'ONCE', 'per_user_limit' => 1]);
    $customer = User::factory()->create();

    CouponUsage::query()->create([
        'coupon_id' => $coupon->id,
        'user_id' => $customer->id,
        'order_id' => null,
    ]);

    Sanctum::actingAs($customer, ['customer']);

    $this->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();

    $this->postJson('/api/v1/cart/coupon', ['code' => 'ONCE'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'You have already used this coupon.');
});

it('removes the coupon and restores the totals', function (): void {
    $product = Product::factory()->create(['price' => 10000, 'stock' => 10]);
    Coupon::factory()->create(['code' => 'TAKE500', 'type' => 'fixed', 'value' => 500]);

    [$token] = guestCartWith($product);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'TAKE500'])
        ->assertOk()
        ->assertJsonPath('data.totals.discount', 500);

    $this->withHeader('X-Cart-Token', $token)
        ->deleteJson('/api/v1/cart/coupon')
        ->assertOk()
        ->assertJsonPath('data.coupon', null)
        ->assertJsonPath('data.totals.discount', 0)
        ->assertJsonPath('data.totals.subtotal', 10000);
});

it('drops a coupon that expired after it was applied', function (): void {
    $product = Product::factory()->create(['price' => 9000, 'stock' => 10]);
    Coupon::factory()->create(['code' => 'SHORT', 'expires_at' => now()->addHour()]);

    [$token] = guestCartWith($product);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'SHORT'])
        ->assertOk();

    $this->travel(2)->hours();

    $this->withHeader('X-Cart-Token', $token)
        ->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonPath('data.coupon', null)
        ->assertJsonPath('data.totals.discount', 0);

    expect(Cart::query()->where('cart_token', $token)->first()->coupon_id)->toBeNull();
});

it('throttles coupon attempts', function (): void {
    $product = Product::factory()->create(['price' => 9000, 'stock' => 10]);
    Coupon::factory()->create(['code' => 'LIMIT', 'type' => 'fixed', 'value' => 100]);

    [$token] = guestCartWith($product);

    for ($i = 0; $i < 20; $i++) {
        $this->withHeader('X-Cart-Token', $token)
            ->postJson('/api/v1/cart/coupon', ['code' => 'LIMIT'])
            ->assertOk();
    }

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'LIMIT'])
        ->assertStatus(429);
});
