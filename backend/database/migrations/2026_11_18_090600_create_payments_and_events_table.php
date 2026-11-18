<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupon_usages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['coupon_id', 'order_id']);
            $table->index(['coupon_id', 'user_id']);
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 20)->default('stripe');
            $table->string('provider_payment_intent_id')->unique();
            $table->string('provider_charge_id')->nullable();
            $table->string('provider_refund_id')->nullable();
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3)->default('usd');
            $table->string('status', 30)->default('requires_payment_method');
            $table->string('stripe_event_id')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('failure_message')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
        });

        Schema::create('stripe_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('stripe_event_id')->unique();
            $table->string('type')->index();
            $table->json('payload');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('order_number_sequences', function (Blueprint $table): void {
            $table->id();
            $table->unsignedSmallInteger('year')->unique();
            $table->unsignedInteger('sequence')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_number_sequences');
        Schema::dropIfExists('stripe_webhook_events');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('coupon_usages');
    }
};
