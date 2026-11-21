<?php

namespace Database\Seeders;

use App\Enums\CouponType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderNumberSequence;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class OrderSeeder extends Seeder
{
    /** @var list<array{status: OrderStatus, days_ago: int, items: array<string, int>, coupon: string|null}> */
    private array $specs = [
        ['status' => OrderStatus::Pending, 'days_ago' => 0, 'items' => ['NOC-0004' => 2, 'NOC-0023' => 1], 'coupon' => null],
        ['status' => OrderStatus::Paid, 'days_ago' => 1, 'items' => ['NOC-0015' => 1], 'coupon' => 'SAVE20'],
        ['status' => OrderStatus::Processing, 'days_ago' => 3, 'items' => ['NOC-0005' => 1, 'NOC-0018' => 1], 'coupon' => null],
        ['status' => OrderStatus::Shipped, 'days_ago' => 5, 'items' => ['NOC-0010' => 1], 'coupon' => null],
        ['status' => OrderStatus::Delivered, 'days_ago' => 12, 'items' => ['NOC-0002' => 1, 'NOC-0017' => 2], 'coupon' => 'WELCOME10'],
        ['status' => OrderStatus::Cancelled, 'days_ago' => 6, 'items' => ['NOC-0021' => 1], 'coupon' => null],
    ];

    public function run(): void
    {
        $customer = User::query()->where('email', 'customer@nocfinity.test')->first();

        if (! $customer) {
            return;
        }

        if (Order::query()->where('user_id', $customer->id)->exists()) {
            return;
        }

        foreach ($this->specs as $index => $spec) {
            $this->createOrder($customer, $spec, $index + 1);
        }
    }

    /**
     * @param  array{status: OrderStatus, days_ago: int, items: array<string, int>, coupon: string|null}  $spec
     */
    private function createOrder(User $customer, array $spec, int $index): void
    {
        $placedAt = Carbon::now()->subDays($spec['days_ago'])->subHours(2);
        $coupon = $spec['coupon'] ? Coupon::query()->where('code', $spec['coupon'])->first() : null;

        $products = Product::query()
            ->whereIn('sku', array_keys($spec['items']))
            ->get()
            ->keyBy('sku');

        $subtotal = 0;
        $lines = [];

        foreach ($spec['items'] as $sku => $quantity) {
            $product = $products->get($sku);

            if (! $product) {
                continue;
            }

            $unitPrice = $product->currentPrice();
            $lineTotal = $unitPrice * $quantity;
            $subtotal += $lineTotal;

            $lines[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_sku' => $product->sku,
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'line_total' => $lineTotal,
                'product_image' => $product->primaryImage?->path,
            ];
        }

        $discount = 0;

        if ($coupon instanceof Coupon && $subtotal >= $coupon->min_order_amount) {
            $discount = $coupon->type === CouponType::Percentage
                ? intdiv($subtotal * $coupon->value, 100)
                : $coupon->value;

            if ($coupon->max_discount_amount !== null) {
                $discount = min($discount, $coupon->max_discount_amount);
            }
        }

        $shipping = $subtotal >= 10000 ? 0 : 999;
        $grandTotal = $subtotal - $discount + $shipping;

        $order = new Order([
            'user_id' => $customer->id,
            'status' => $spec['status'],
            'subtotal' => $subtotal,
            'discount_total' => $discount,
            'shipping_total' => $shipping,
            'tax_total' => 0,
            'grand_total' => $grandTotal,
            'coupon_id' => $discount > 0 ? $coupon?->id : null,
            'coupon_code' => $discount > 0 ? $coupon?->code : null,
            'customer_name' => $customer->name,
            'customer_email' => $customer->email,
            'shipping_name' => $customer->name,
            'shipping_phone' => '+1 555 010 2030',
            'shipping_line1' => '144 Prince Street',
            'shipping_line2' => 'Apt 4B',
            'shipping_city' => 'New York',
            'shipping_state' => 'NY',
            'shipping_postal_code' => '10012',
            'shipping_country' => 'US',
            'notes' => null,
        ]);

        $order->order_number = $this->nextOrderNumber((int) $placedAt->format('Y'));
        $order->created_at = $placedAt;
        $order->updated_at = $placedAt;
        $order->placed_at = $placedAt;
        $order->save();

        foreach ($lines as $line) {
            OrderItem::query()->create(['order_id' => $order->id] + $line);
        }

        $this->writeHistory($order, $placedAt, $index);
        $this->createPayment($order, $placedAt, $index);

        if ($discount > 0 && $coupon instanceof Coupon) {
            $coupon->increment('used_count');
            CouponUsage::query()->create([
                'coupon_id' => $coupon->id,
                'user_id' => $customer->id,
                'order_id' => $order->id,
            ]);
        }
    }

    private function writeHistory(Order $order, Carbon $placedAt, int $index): void
    {
        $paths = match ($order->status) {
            OrderStatus::Pending => [[null, OrderStatus::Pending]],
            OrderStatus::Paid => [[null, OrderStatus::Pending], [OrderStatus::Pending, OrderStatus::Paid]],
            OrderStatus::Processing => [[null, OrderStatus::Pending], [OrderStatus::Pending, OrderStatus::Paid], [OrderStatus::Paid, OrderStatus::Processing]],
            OrderStatus::Shipped => [[null, OrderStatus::Pending], [OrderStatus::Pending, OrderStatus::Paid], [OrderStatus::Paid, OrderStatus::Processing], [OrderStatus::Processing, OrderStatus::Shipped]],
            OrderStatus::Delivered => [[null, OrderStatus::Pending], [OrderStatus::Pending, OrderStatus::Paid], [OrderStatus::Paid, OrderStatus::Processing], [OrderStatus::Processing, OrderStatus::Shipped], [OrderStatus::Shipped, OrderStatus::Delivered]],
            OrderStatus::Cancelled => [[null, OrderStatus::Pending], [OrderStatus::Pending, OrderStatus::Cancelled]],
        };

        foreach ($paths as $step => [$from, $to]) {
            $at = $placedAt->copy()->addMinutes($step * 7);

            $history = new OrderStatusHistory([
                'order_id' => $order->id,
                'from_status' => $from,
                'to_status' => $to,
                'changed_by' => null,
                'note' => $step === 0 ? 'Order placed (seed data)' : null,
            ]);
            $history->created_at = $at;
            $history->updated_at = $at;
            $history->save();
        }

        if ($order->status === OrderStatus::Paid || $order->status->isPaid()) {
            $order->forceFill(['paid_at' => $placedAt->copy()->addMinutes(7)])->save();
        }

        if ($order->status === OrderStatus::Cancelled) {
            $order->forceFill(['cancelled_at' => $placedAt->copy()->addMinutes(7)])->save();
        }
    }

    private function createPayment(Order $order, Carbon $placedAt, int $index): void
    {
        if (! $order->status->isPaid()) {
            return;
        }

        Payment::query()->create([
            'order_id' => $order->id,
            'provider' => 'stripe',
            'provider_payment_intent_id' => sprintf('pi_seed_%04d', $index),
            'amount' => $order->grand_total,
            'currency' => 'usd',
            'status' => PaymentStatus::Succeeded,
            'paid_at' => $placedAt->copy()->addMinutes(7),
        ]);
    }

    private function nextOrderNumber(int $year): string
    {
        $sequence = OrderNumberSequence::query()->firstOrCreate(['year' => $year], ['sequence' => 0]);
        $sequence->sequence++;
        $sequence->save();

        return sprintf('ORD-%d-%06d', $year, $sequence->sequence);
    }
}
