<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P13: checkout idempotency is per customer. A global unique key made a
 * customer reusing a key that another customer already used fail with a
 * database error instead of resuming (or creating) their own order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropUnique(['checkout_idempotency_key']);
            $table->unique(['user_id', 'checkout_idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'checkout_idempotency_key']);
            $table->unique(['checkout_idempotency_key']);
        });
    }
};
