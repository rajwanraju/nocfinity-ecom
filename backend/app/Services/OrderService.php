<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Exceptions\InvalidOrderTransitionException;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderStatusChanged;
use App\Support\Stripe\StripeGateway;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * FR-ORDER-11/12/14: the binding transition table plus the side effects that
 * must accompany cancellation (refund, stock restore, coupon restore).
 */
class OrderService
{
    public function __construct(
        private readonly StripeGateway $stripe,
        private readonly SettingService $settings,
    ) {}

    public function transition(
        Order $order,
        OrderStatus $to,
        ?User $actor = null,
        ?string $note = null,
    ): Order {
        return DB::transaction(function () use ($order, $to, $actor, $note): Order {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;

            if (! $from->canTransitionTo($to)) {
                throw new InvalidOrderTransitionException($from, $to);
            }

            if ($to === OrderStatus::Cancelled) {
                $this->cancelSideEffects($locked);
            }

            if ($to === OrderStatus::Paid) {
                $locked->paid_at = now();
            }

            if ($to === OrderStatus::Cancelled) {
                $locked->cancelled_at = now();
            }

            $locked->status = $to;
            $locked->save();

            OrderStatusHistory::query()->create([
                'order_id' => $locked->id,
                'from_status' => $from,
                'to_status' => $to,
                'changed_by' => $actor?->id,
                'note' => $note,
            ]);

            $locked->user?->notify(new OrderStatusChanged($locked, $from, $to));

            return $locked->refresh()->load(['items', 'latestPayment']);
        });
    }

    /**
     * Scheduled command: cancel pending orders that outlived the configured
     * window and release their uncaptured PaymentIntents.
     */
    public function expirePending(): int
    {
        $minutes = max(1, $this->settings->integer('orders.pending_expiry_minutes', 60));

        $ids = Order::query()
            ->where('status', OrderStatus::Pending)
            ->where('created_at', '<=', now()->subMinutes($minutes))
            ->pluck('id');

        $expired = 0;

        foreach ($ids as $id) {
            $order = Order::query()->find($id);

            if ($order === null) {
                continue;
            }

            try {
                $this->transition(
                    $order,
                    OrderStatus::Cancelled,
                    null,
                    "Expired after {$minutes} minutes without payment.",
                );
                $expired++;
            } catch (InvalidOrderTransitionException) {
                // Another worker changed it first; nothing to do.
            }
        }

        return $expired;
    }

    private function cancelSideEffects(Order $order): void
    {
        $payment = $order->latestPayment;

        if ($order->status === OrderStatus::Pending) {
            if ($payment !== null && in_array($payment->status, [
                PaymentStatus::RequiresPaymentMethod,
                PaymentStatus::RequiresConfirmation,
                PaymentStatus::RequiresAction,
                PaymentStatus::Processing,
            ], true)) {
                try {
                    $this->stripe->cancelPaymentIntent($payment->provider_payment_intent_id);
                } catch (Throwable) {
                    // The PaymentIntent may already be cancelled or expired.
                }

                $payment->forceFill([
                    'status' => PaymentStatus::Canceled,
                    'failure_message' => 'Order cancelled before payment.',
                ])->save();
            }

            return;
        }

        if ($payment !== null && $payment->status === PaymentStatus::Succeeded) {
            $refundId = $this->stripe->refund(
                $payment->provider_payment_intent_id,
                $payment->amount,
                'cancel-'.$order->id,
            );

            $payment->forceFill([
                'status' => PaymentStatus::Refunded,
                'provider_refund_id' => $refundId,
                'refunded_at' => now(),
            ])->save();
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

            if ($product !== null) {
                $product->forceFill(['stock' => $product->stock + $item->quantity])->save();
            }
        }

        if ($order->coupon_id !== null) {
            CouponUsage::query()->where('order_id', $order->id)->delete();
            Coupon::query()
                ->whereKey($order->coupon_id)
                ->where('used_count', '>', 0)
                ->decrement('used_count');
        }
    }
}
