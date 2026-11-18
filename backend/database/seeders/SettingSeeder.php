<?php

namespace Database\Seeders;

use App\Enums\SettingType;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // key, value, type, group
            ['store.name', 'Nocfinity', SettingType::String, 'store'],
            ['store.support_email', 'support@nocfinity.test', SettingType::String, 'store'],
            ['currency', 'USD', SettingType::String, 'store'],
            ['shipping.flat_fee', '999', SettingType::Integer, 'shipping'],
            ['shipping.free_threshold', '10000', SettingType::Integer, 'shipping'],
            ['tax.percent', '0', SettingType::Integer, 'tax'],
            ['products.low_stock_threshold', '5', SettingType::Integer, 'products'],
            ['cart.max_quantity_per_line', '10', SettingType::Integer, 'cart'],
            ['orders.pending_expiry_minutes', '60', SettingType::Integer, 'orders'],
            ['reviews.enabled', '0', SettingType::Boolean, 'reviews'],
        ];

        foreach ($settings as [$key, $value, $type, $group]) {
            Setting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'type' => $type, 'group' => $group],
            );
        }
    }
}
