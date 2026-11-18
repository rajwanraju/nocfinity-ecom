<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            // Client retries with the same key return the same pending order.
            $table->string('checkout_idempotency_key', 100)->nullable()->unique()->after('order_number');
        });

        Schema::table('payments', function (Blueprint $table): void {
            // Returned to the browser for Stripe Elements; never listed elsewhere.
            $table->text('client_secret')->nullable()->after('provider_payment_intent_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropUnique(['checkout_idempotency_key']);
            $table->dropColumn('checkout_idempotency_key');
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->dropColumn('client_secret');
        });
    }
};
