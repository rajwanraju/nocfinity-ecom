<?php

use Illuminate\Support\Facades\Schema;

it('creates every required table', function (): void {
    $tables = [
        'users',
        'password_reset_tokens',
        'personal_access_tokens',
        'roles',
        'permissions',
        'model_has_roles',
        'model_has_permissions',
        'role_has_permissions',
        'categories',
        'products',
        'product_images',
        'carts',
        'cart_items',
        'coupons',
        'coupon_usages',
        'orders',
        'order_items',
        'order_status_histories',
        'payments',
        'stripe_webhook_events',
        'order_number_sequences',
        'settings',
        'activity_logs',
    ];

    foreach ($tables as $table) {
        expect(Schema::hasTable($table))->toBeTrue("Missing table: {$table}");
    }
});
