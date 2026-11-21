<?php

namespace App\Services;

use App\Enums\CouponType;
use App\Models\Cart;
use App\Models\Coupon;

/**
 * The single source of truth for every money value (SEC-1).
 *
 * Cart lines, subtotal, coupon discount, shipping, tax and total are always
 * derived from the database and settings. Client-supplied amounts are never
 * read. P6 reuses this service for checkout, so a cart and an order can never
 * disagree about what a customer owes.
 */
class PricingService
{
    public function __construct(private readonly SettingService $settings) {}

    /**
     * @return array{
     *     items: list<array<string, mixed>>,
     *     item_count: int,
     *     coupon: array<string, mixed>|null,
     *     totals: array{subtotal: int, discount: int, shipping: int, tax: int, total: int}
     * }
     */
    public function quote(Cart $cart, ?Coupon $coupon): array
    {
        $cart->loadMissing(['items.product.category', 'items.product.primaryImage']);

        $maxPerLine = max(1, $this->settings->integer('cart.max_quantity_per_line', 10));
        $lines = [];
        $subtotal = 0;
        $itemCount = 0;

        foreach ($cart->items as $item) {
            $product = $item->product;
            $currentPrice = $product?->currentPrice() ?? $item->unit_price;
            $isAvailable = $product !== null
                && $product->is_active
                && $product->category?->is_active === true
                && $product->stock > 0;

            $warnings = [];

            if ($product === null) {
                $warnings[] = 'product_unavailable';
            } else {
                if (! $product->is_active) {
                    $warnings[] = 'product_inactive';
                }

                if ($product->category === null || ! $product->category->is_active) {
                    $warnings[] = 'category_inactive';
                }

                if ($product->stock <= 0) {
                    $warnings[] = 'out_of_stock';
                } elseif ($item->quantity > $product->stock) {
                    $warnings[] = 'insufficient_stock';
                }

                if ($item->unit_price !== $currentPrice) {
                    $warnings[] = 'price_changed';
                }
            }

            $lineTotal = $isAvailable ? $currentPrice * $item->quantity : 0;

            if ($isAvailable) {
                $subtotal += $lineTotal;
                $itemCount += $item->quantity;
            }

            $lines[] = [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'name' => $product?->name,
                'slug' => $product?->slug,
                'sku' => $product?->sku,
                'image_url' => $product?->primaryImage?->url,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'current_unit_price' => $currentPrice,
                'line_total' => $lineTotal,
                'available_quantity' => $product === null ? 0 : min($product->stock, $maxPerLine),
                'is_available' => $isAvailable,
                'warnings' => $warnings,
            ];
        }

        $discount = $coupon !== null ? $this->couponDiscount($coupon, $subtotal) : 0;
        $discountedSubtotal = $subtotal - $discount;

        $shipping = 0;

        if ($subtotal > 0) {
            $freeThreshold = $this->settings->integer('shipping.free_threshold', 10000);
            $shipping = $discountedSubtotal >= $freeThreshold
                ? 0
                : $this->settings->integer('shipping.flat_fee', 999);
        }

        $taxPercent = max(0, $this->settings->integer('tax.percent', 0));
        $tax = intdiv($discountedSubtotal * $taxPercent, 100);

        return [
            'items' => $lines,
            'item_count' => $itemCount,
            'coupon' => $coupon === null ? null : [
                'code' => $coupon->code,
                'type' => $coupon->type->value,
                'value' => $coupon->value,
                'discount' => $discount,
            ],
            'totals' => [
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping' => $shipping,
                'tax' => $tax,
                'total' => $discountedSubtotal + $shipping + $tax,
            ],
        ];
    }

    /**
     * Percentage coupons floor to whole cents and may be capped by
     * max_discount_amount; fixed coupons never exceed the subtotal.
     */
    public function couponDiscount(Coupon $coupon, int $subtotal): int
    {
        if ($subtotal <= 0 || $subtotal < $coupon->min_order_amount) {
            return 0;
        }

        $discount = match ($coupon->type) {
            CouponType::Percentage => intdiv($subtotal * $coupon->value, 100),
            CouponType::Fixed => $coupon->value,
        };

        if ($coupon->max_discount_amount !== null) {
            $discount = min($discount, $coupon->max_discount_amount);
        }

        return max(0, min($discount, $subtotal));
    }
}
