<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\User;

it('merges the guest cart into the user cart on login, capped by stock', function (): void {
    $product = Product::factory()->create(['price' => 1000, 'stock' => 5]);
    $customer = User::factory()->create(['password' => 'Customer123!']);

    $userCart = Cart::query()->create(['user_id' => $customer->id]);
    CartItem::query()->create([
        'cart_id' => $userCart->id,
        'product_id' => $product->id,
        'quantity' => 4,
        'unit_price' => 1000,
    ]);

    $guest = $this->postJson('/api/v1/cart/items', [
        'product_id' => $product->id,
        'quantity' => 3,
    ])->assertOk();

    $guestToken = $guest->json('meta.cart_token');

    $login = $this->withHeader('X-Cart-Token', $guestToken)
        ->postJson('/api/v1/auth/login', [
            'email' => $customer->email,
            'password' => 'Customer123!',
        ])
        ->assertOk();

    forgetAuthGuards();

    $this->withToken($login->json('data.token'))
        ->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.quantity', 5)
        ->assertJsonPath('data.totals.subtotal', 5000);

    expect(Cart::query()->where('cart_token', $guestToken)->exists())->toBeFalse();
});

it('keeps the user coupon when merging and adopts the guest coupon only when empty', function (): void {
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);
    $customer = User::factory()->create(['password' => 'Customer123!']);

    $guestCoupon = Coupon::factory()->create(['code' => 'GUEST5', 'type' => 'fixed', 'value' => 500]);
    $userCoupon = Coupon::factory()->create(['code' => 'USER5', 'type' => 'fixed', 'value' => 300]);

    $userCart = Cart::query()->create(['user_id' => $customer->id, 'coupon_id' => $userCoupon->id]);

    $guest = $this->postJson('/api/v1/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
    ])->assertOk();
    $guestToken = $guest->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $guestToken)
        ->postJson('/api/v1/cart/coupon', ['code' => $guestCoupon->code])
        ->assertOk();

    $login = $this->withHeader('X-Cart-Token', $guestToken)
        ->postJson('/api/v1/auth/login', [
            'email' => $customer->email,
            'password' => 'Customer123!',
        ])
        ->assertOk();

    forgetAuthGuards();

    $this->withToken($login->json('data.token'))
        ->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonPath('data.coupon.code', 'USER5');

    expect($userCart->fresh()->coupon_id)->toBe($userCoupon->id);
});
