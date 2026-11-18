<?php

namespace Database\Seeders;

use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Database\Seeder;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $coupons = [
            [
                'code' => 'WELCOME10',
                'type' => CouponType::Percentage,
                'value' => 10,
                'min_order_amount' => 5000,
                'max_discount_amount' => 2500,
                'usage_limit' => 1000,
                'per_user_limit' => 1,
                'starts_at' => now()->subMonth(),
                'expires_at' => now()->addYear(),
                'is_active' => true,
            ],
            [
                'code' => 'SAVE20',
                'type' => CouponType::Fixed,
                'value' => 2000,
                'min_order_amount' => 10000,
                'max_discount_amount' => null,
                'usage_limit' => 500,
                'per_user_limit' => 1,
                'starts_at' => now()->subWeek(),
                'expires_at' => now()->addMonths(6),
                'is_active' => true,
            ],
            [
                'code' => 'EXPIRED10',
                'type' => CouponType::Percentage,
                'value' => 15,
                'min_order_amount' => 0,
                'max_discount_amount' => 2000,
                'usage_limit' => null,
                'per_user_limit' => 1,
                'starts_at' => now()->subMonths(2),
                'expires_at' => now()->subDay(),
                'is_active' => true,
            ],
        ];

        foreach ($coupons as $coupon) {
            Coupon::query()->updateOrCreate(
                ['code' => $coupon['code']],
                $coupon,
            );
        }
    }
}
