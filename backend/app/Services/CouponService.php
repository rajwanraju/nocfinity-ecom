<?php

namespace App\Services;

use App\Exceptions\CouponException;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\User;

/**
 * FR-COUPON-2: every rule has its own message, and the same checks run when a
 * coupon is applied and (from P6) at checkout and payment time.
 */
class CouponService
{
    public function __construct(private readonly PricingService $pricing) {}

    public function find(string $code): Coupon
    {
        $coupon = Coupon::query()
            ->where('code', mb_strtoupper(trim($code)))
            ->first();

        if ($coupon === null) {
            throw new CouponException('This coupon code is invalid.');
        }

        return $coupon;
    }

    public function validate(Coupon $coupon, int $subtotal, ?User $user): void
    {
        if (! $coupon->is_active) {
            throw new CouponException('This coupon is inactive.');
        }

        if ($coupon->starts_at !== null && $coupon->starts_at->isFuture()) {
            throw new CouponException('This coupon is not valid yet.');
        }

        if ($coupon->expires_at !== null && $coupon->expires_at->isPast()) {
            throw new CouponException('This coupon has expired.');
        }

        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw new CouponException('This coupon has reached its usage limit.');
        }

        if ($user !== null && $coupon->per_user_limit !== null) {
            $usedByUser = CouponUsage::query()
                ->where('coupon_id', $coupon->id)
                ->where('user_id', $user->id)
                ->count();

            if ($usedByUser >= $coupon->per_user_limit) {
                throw new CouponException('You have already used this coupon.');
            }
        }

        if ($subtotal < $coupon->min_order_amount) {
            $minimum = number_format($coupon->min_order_amount / 100, 2);

            throw new CouponException("This coupon requires a minimum order of \${$minimum}.");
        }
    }

    /**
     * Validate a code against the cart's current (server-computed) subtotal.
     */
    public function validateForCart(string $code, Cart $cart, ?User $user): Coupon
    {
        $coupon = $this->find($code);
        $subtotal = $this->pricing->quote($cart, null)['totals']['subtotal'];

        $this->validate($coupon, $subtotal, $user);

        return $coupon;
    }
}
