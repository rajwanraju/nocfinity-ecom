<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Exceptions\CouponException;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\StripeWebhookEvent;
use App\Notifications\OrderStatusChanged;
use App\Support\Stripe\StripeGateway;
use Illuminate\Support\Facades\DB;

/**
 * FR-ORDER-5/6/7/8: the only place an order can become paid. Signature
 * verification happens in the controller; this service is idempotent by
 * event id and locks the order, payment and products while it works.
 */
class PaymentWebhookService
{
    public function __construct(
        private readonly StripeGateway $stripe,
        private readonly CouponService $coupons,
    ) {}

    /**
     * @param  array<string, mixed>  $event
     */
    public function handle(array $event): void
    {
        $eventId = (string) ($event['id'] ?? '');
        $type = (string) ($event['type'] ?? '');

        if ($eventId === '' || $type === '') {
            return;
        }

        if (StripeWebhookEvent::query()->where('stripe_event_id', $eventId)->exists()) {
            return;
        }

        DB::transaction(function () use ($event, $eventId, $type): void {
            $record = StripeWebhookEvent::query()->create([
                'stripe_event_id' => $eventId,
                'type' => $type,
                'payload' => $event,
            ]);

            $object = $event['data']['object'] ?? [];
            $object = is_array($object) ? $object : [];

            match ($type) {
                'payment_intent.succeeded' => $this->succeeded($object),
                'payment_intent.payment_failed' => $this->failed($object),
                default => null,
            };

            $record->forceFill(['processed_at' => now()])->save();
        });
    }

    /**
     * @param  array<string, mixed>  $object
     */
    private function succeeded(array $object): void
    {
        $orderId = (int) ($object['metadata']['order_id'] ?? 0);

        if ($orderId <= 0) {
            return;
        }

        $order = Order::query()->whereKey($orderId)->lockForUpdate()->first();

        if ($order === null) {
            return;
        }

        $payment = Payment::query()
            ->where('order_id', $order->id)
            ->where('provider_payment_intent_id', (string) ($object['id'] ?? ''))
            ->lockForUpdate()
            ->first();

        if ($payment === null) {
            return;
        }

        // A second success (or a webhook for a cancelled order) must not
        // decrement stock again.
        if ($order->status !== OrderStatus::Pending) {
            return;
        }

        if ((int) ($object['amount'] ?? 0) !== $order->grand_total) {
            $this->refundAndCancel($order, $payment, $object, 'Paid amount does not match the order total.');

            return;
        }

        if (! $this->couponStillValid($order)) {
            $this->refundAndCancel($order, $payment, $object, 'The coupon is no longer valid.');

            return;
        }

        $items = $order->items()->get();

        $products = Product::query()
            ->whereIn('id', $items->pluck('product_id')->filter()->all())
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($items as $item) {
            $product = $products->get($item->product_id);

            if ($product === null || ! $product->is_active || $product->stock < $item->quantity) {
                $this->refundAndCancel($order, $payment, $object, 'Stock is no longer available.');

                return;
            }
        }

        foreach ($items as $item) {
            $product = $products->get($item->product_id);
            $product->forceFill(['stock' => $product->stock - $item->quantity])->save();
        }

        $this->recordCouponUsage($order);

        $payment->forceFill([
            'status' => PaymentStatus::Succeeded,
            'provider_charge_id' => $this->chargeId($object),
            'paid_at' => now(),
            'failure_message' => null,
        ])->save();

        $order->forceFill([
            'status' => OrderStatus::Paid,
            'paid_at' => now(),
        ])->save();

        OrderStatusHistory::query()->create([
            'order_id' => $order->id,
            'from_status' => OrderStatus::Pending,
            'to_status' => OrderStatus::Paid,
            'changed_by' => null,
            'note' => 'Payment succeeded.',
        ]);

        $this->notify($order, OrderStatus::Pending, OrderStatus::Paid);
    }

    /**
     * @param  array<string, mixed>  $object
     */
    private function failed(array $object): void
    {
        $payment = Payment::query()
            ->where('provider_payment_intent_id', (string) ($object['id'] ?? ''))
            ->lockForUpdate()
            ->first();

        if ($payment === null) {
            return;
        }

        // FR-ORDER-6: the order stays pending and no stock moves.
        $payment->forceFill([
            'status' => PaymentStatus::Failed,
            'failure_message' => $object['last_payment_error']['message'] ?? 'Payment failed.',
        ])->save();
    }

    private function couponStillValid(Order $order): bool
    {
        if ($order->coupon_id === null) {
            return true;
        }

        $coupon = Coupon::query()->find($order->coupon_id);

        if ($coupon === null) {
            return false;
        }

        try {
            $this->coupons->validate($coupon, $order->subtotal, $order->user);
        } catch (CouponException) {
            return false;
        }

        return true;
    }

    private function recordCouponUsage(Order $order): void
    {
        if ($order->coupon_id === null) {
            return;
        }

        $usage = CouponUsage::query()->firstOrCreate(
            ['coupon_id' => $order->coupon_id, 'order_id' => $order->id],
            ['user_id' => $order->user_id],
        );

        if ($usage->wasRecentlyCreated) {
            Coupon::query()->whereKey($order->coupon_id)->increment('used_count');
        }
    }

    /**
     * @param  array<string, mixed>  $object
     */
    private function refundAndCancel(Order $order, Payment $payment, array $object, string $reason): void
    {
        $paymentIntentId = (string) ($object['id'] ?? $payment->provider_payment_intent_id);

        $refundId = $this->stripe->refund(
            $paymentIntentId,
            (int) ($object['amount'] ?? $payment->amount),
            'refund-'.$paymentIntentId,
        );

        $payment->forceFill([
            'status' => PaymentStatus::Refunded,
            'provider_refund_id' => $refundId,
            'refunded_at' => now(),
            'failure_message' => $reason,
        ])->save();

        $from = $order->status;

        $order->forceFill([
            'status' => OrderStatus::Cancelled,
            'cancelled_at' => now(),
        ])->save();

        OrderStatusHistory::query()->create([
            'order_id' => $order->id,
            'from_status' => $from,
            'to_status' => OrderStatus::Cancelled,
            'changed_by' => null,
            'note' => $reason,
        ]);

        $this->notify($order, $from, OrderStatus::Cancelled);
    }

    /**
     * @param  array<string, mixed>  $object
     */
    private function chargeId(array $object): ?string
    {
        $charge = $object['latest_charge'] ?? $object['charges']['data'][0]['id'] ?? null;

        return is_string($charge) ? $charge : null;
    }

    private function notify(Order $order, OrderStatus $from, OrderStatus $to): void
    {
        $order->user?->notify(new OrderStatusChanged($order, $from, $to));
    }
}
