<?php

namespace App\Services;

use App\Exceptions\CouponException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * FR-CART: one cart per customer, one per guest token, merged on login.
 * Every quantity and price is derived from the database; requests may only
 * choose a product and a quantity.
 */
class CartService
{
    public function __construct(
        private readonly PricingService $pricing,
        private readonly CouponService $coupons,
        private readonly SettingService $settings,
    ) {}

    /**
     * Resolve (and create on demand) the cart that owns this request.
     * A customer token wins; a guest token from the header or cookie is
     * merged in so a stale BFF token can never strand items.
     */
    public function resolve(Request $request): Cart
    {
        $user = $request->user('sanctum');

        if ($user !== null) {
            if (! $user->isCustomer()) {
                abort(403, 'This action is unauthorized.');
            }

            $cart = Cart::query()->firstOrCreate(['user_id' => $user->id]);
            $token = $this->tokenFromRequest($request);

            if ($token !== null) {
                $this->mergeGuestCart($user, $token);
                $cart = $cart->refresh();
            }

            return $cart;
        }

        $token = $this->tokenFromRequest($request);

        if ($token !== null) {
            $guestCart = Cart::query()->where('cart_token', $token)->first();

            if ($guestCart !== null) {
                return $guestCart;
            }
        }

        return Cart::query()->create(['cart_token' => (string) Str::uuid()]);
    }

    public function tokenFromRequest(Request $request): ?string
    {
        $token = $request->header('X-Cart-Token') ?? $request->cookie('cart_token');

        if (! is_string($token) || ! Str::isUuid($token)) {
            return null;
        }

        return mb_strtolower($token);
    }

    /**
     * @return array<string, mixed>
     */
    public function present(Cart $cart): array
    {
        $coupon = $cart->coupon;

        if ($coupon !== null) {
            $subtotal = $this->pricing->quote($cart, null)['totals']['subtotal'];

            try {
                $this->coupons->validate($coupon, $subtotal, $cart->user);
            } catch (CouponException) {
                // The coupon lapsed after it was applied: drop it rather than
                // silently quoting a discount the customer cannot get.
                $cart->forceFill(['coupon_id' => null])->save();
                $cart->unsetRelation('coupon');
                $coupon = null;
            }
        }

        return [
            'id' => $cart->id,
            'is_guest' => $cart->isGuest(),
            ...$this->pricing->quote($cart, $coupon),
        ];
    }

    public function addItem(Cart $cart, int $productId, int $quantity): void
    {
        $product = $this->purchasableProduct($productId);
        $max = $this->maxQuantity($product);
        $existing = $cart->items()->where('product_id', $product->id)->first();
        $newQuantity = ($existing?->quantity ?? 0) + $quantity;

        if ($quantity > $max || $newQuantity > $max) {
            throw ValidationException::withMessages([
                'quantity' => ["Only {$max} unit(s) of {$product->name} can be added to the cart."],
            ]);
        }

        if ($existing !== null) {
            $existing->forceFill(['quantity' => $newQuantity])->save();

            return;
        }

        $cart->items()->create([
            'product_id' => $product->id,
            'quantity' => $quantity,
            // Snapshot for change detection only; totals always use currentPrice().
            'unit_price' => $product->currentPrice(),
        ]);
    }

    public function updateItem(Cart $cart, int $itemId, int $quantity): void
    {
        $item = $this->findItem($cart, $itemId);
        $product = $this->purchasableProduct($item->product_id);
        $max = $this->maxQuantity($product);

        if ($quantity > $max) {
            throw ValidationException::withMessages([
                'quantity' => ["Only {$max} unit(s) of {$product->name} are available."],
            ]);
        }

        $item->forceFill(['quantity' => $quantity])->save();
    }

    public function removeItem(Cart $cart, int $itemId): void
    {
        $item = $this->findItem($cart, $itemId);
        $item->delete();

        if (! $cart->items()->exists()) {
            $cart->forceFill(['coupon_id' => null])->save();
        }
    }

    public function clear(Cart $cart): void
    {
        $cart->items()->delete();
        $cart->forceFill(['coupon_id' => null])->save();
    }

    public function applyCoupon(Cart $cart, string $code, ?User $user): void
    {
        $subtotal = $this->pricing->quote($cart, null)['totals']['subtotal'];

        if ($subtotal <= 0) {
            throw new CouponException('Add items to your cart before applying a coupon.');
        }

        $coupon = $this->coupons->validateForCart($code, $cart, $user);

        $cart->forceFill(['coupon_id' => $coupon->id])->save();
    }

    public function removeCoupon(Cart $cart): void
    {
        $cart->forceFill(['coupon_id' => null])->save();
    }

    /**
     * FR-CART-5: quantities are summed and capped by stock and the per-line
     * cap. Unavailable products are dropped, not merged.
     */
    public function mergeGuestCart(User $user, ?string $token): void
    {
        if ($token === null) {
            return;
        }

        DB::transaction(function () use ($user, $token): void {
            $guest = Cart::query()
                ->where('cart_token', $token)
                ->whereNull('user_id')
                ->with(['items.product.category'])
                ->lockForUpdate()
                ->first();

            if ($guest === null) {
                return;
            }

            $cart = Cart::query()->firstOrCreate(['user_id' => $user->id]);

            if ($cart->coupon_id === null && $guest->coupon_id !== null) {
                $cart->forceFill(['coupon_id' => $guest->coupon_id])->save();
            }

            foreach ($guest->items as $item) {
                $product = $item->product;

                if ($product === null
                    || ! $product->is_active
                    || $product->category?->is_active !== true
                    || $product->stock <= 0) {
                    continue;
                }

                $max = $this->maxQuantity($product);
                $existing = $cart->items()->where('product_id', $product->id)->first();
                $quantity = min($max, ($existing?->quantity ?? 0) + $item->quantity);

                if ($quantity < 1) {
                    continue;
                }

                if ($existing !== null) {
                    $existing->forceFill(['quantity' => $quantity])->save();

                    continue;
                }

                $cart->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $product->currentPrice(),
                ]);
            }

            // Deleting the guest cart cascades its lines; a later request with
            // the same token therefore cannot merge twice.
            $guest->delete();
        });
    }

    private function findItem(Cart $cart, int $itemId): CartItem
    {
        $item = $cart->items()->whereKey($itemId)->first();

        // 404 (not 403) keeps other customers' cart ids indistinguishable.
        abort_if($item === null, 404);

        return $item;
    }

    private function purchasableProduct(int $productId): Product
    {
        $product = Product::query()->with('category')->find($productId);

        if ($product === null || ! $product->is_active || $product->category?->is_active !== true) {
            throw ValidationException::withMessages([
                'quantity' => ['This product is not available for purchase.'],
            ]);
        }

        if ($product->stock <= 0) {
            throw ValidationException::withMessages([
                'quantity' => ['This product is out of stock.'],
            ]);
        }

        return $product;
    }

    private function maxQuantity(Product $product): int
    {
        $cap = max(1, $this->settings->integer('cart.max_quantity_per_line', 10));

        return max(0, min($product->stock, $cap));
    }
}
