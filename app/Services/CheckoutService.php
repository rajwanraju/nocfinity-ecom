<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Exceptions\CouponException;
use App\Exceptions\PaymentGatewayUnavailableException;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Support\OrderNumberGenerator;
use App\Support\Stripe\StripeGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * FR-ORDER-2/3: turn the server-side cart into a pending order with snapshots
 * and a Stripe PaymentIntent. Everything is recalculated from the database
 * inside a transaction; the client only supplies an address and a coupon code.
 */
class CheckoutService
{
    public function __construct(
        private readonly PricingService $pricing,
        private readonly CouponService $coupons,
        private readonly OrderNumberGenerator $numbers,
        private readonly StripeGateway $stripe,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{order: Order, client_secret: string|null, created: bool}
     */
    public function checkout(User $user, array $data, ?string $idempotencyKey): array
    {
        $key = $this->idempotencyKey($user, $data, $idempotencyKey);

        $existing = Order::query()
            ->where('user_id', $user->id)
            ->where('checkout_idempotency_key', $key)
            ->first();

        if ($existing !== null) {
            return $this->resume($existing);
        }

        return DB::transaction(function () use ($user, $data, $key): array {
            $existing = Order::query()
                ->where('user_id', $user->id)
                ->where('checkout_idempotency_key', $key)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return $this->resume($existing);
            }

            $cart = Cart::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($cart === null || ! $cart->items()->exists()) {
                throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
            }

            $items = $cart->items()->orderBy('product_id')->get();

            // FR-ORDER-8: lock products in id order to avoid deadlocks.
            $products = Product::query()
                ->with(['category', 'primaryImage'])
                ->whereIn('id', $items->pluck('product_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($items as $item) {
                $item->setRelation('product', $products->get($item->product_id));
            }

            $cart->setRelation('items', $items);

            $coupon = $this->resolveCoupon($cart, $data, $user);
            $quote = $this->pricing->quote($cart, $coupon);

            if ($quote['totals']['subtotal'] <= 0) {
                throw ValidationException::withMessages(['cart' => ['Your cart has no available items.']]);
            }

            foreach ($quote['items'] as $line) {
                if (! $line['is_available'] || $line['quantity'] > $line['available_quantity']) {
                    throw ValidationException::withMessages([
                        'cart' => ["{$line['name']} is no longer available in the requested quantity."],
                    ]);
                }
            }

            if ($quote['totals']['total'] < 50) {
                throw ValidationException::withMessages([
                    'cart' => ['The order total is too small for card payment.'],
                ]);
            }

            $discount = $quote['totals']['discount'];

            // Without a secret key the PaymentIntent call fails after the order
            // row is written; fail before persisting anything with a clear 503.
            if (trim((string) config('services.stripe.secret')) === '') {
                throw new PaymentGatewayUnavailableException;
            }

            $order = Order::query()->create([
                'order_number' => $this->numbers->next(),
                'checkout_idempotency_key' => $key,
                'user_id' => $user->id,
                'status' => OrderStatus::Pending,
                'subtotal' => $quote['totals']['subtotal'],
                'discount_total' => $discount,
                'shipping_total' => $quote['totals']['shipping'],
                'tax_total' => $quote['totals']['tax'],
                'grand_total' => $quote['totals']['total'],
                'coupon_id' => $coupon !== null && $discount > 0 ? $coupon->id : null,
                'coupon_code' => $coupon !== null && $discount > 0 ? $coupon->code : null,
                'customer_name' => $user->name,
                'customer_email' => $user->email,
                'shipping_name' => $data['shipping_name'],
                'shipping_phone' => $data['shipping_phone'],
                'shipping_line1' => $data['shipping_line1'],
                'shipping_line2' => $data['shipping_line2'] ?? null,
                'shipping_city' => $data['shipping_city'],
                'shipping_state' => $data['shipping_state'],
                'shipping_postal_code' => $data['shipping_postal_code'],
                'shipping_country' => $data['shipping_country'],
                'notes' => $data['notes'] ?? null,
                'placed_at' => now(),
            ]);

            foreach ($quote['items'] as $line) {
                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'product_id' => $line['product_id'],
                    'product_name' => (string) $line['name'],
                    'product_sku' => (string) $line['sku'],
                    'unit_price' => $line['current_unit_price'],
                    'quantity' => $line['quantity'],
                    'line_total' => $line['line_total'],
                    'product_image' => $products->get($line['product_id'])?->primaryImage?->path,
                ]);
            }

            OrderStatusHistory::query()->create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => OrderStatus::Pending,
                'changed_by' => null,
                'note' => 'Order placed.',
            ]);

            // The Stripe idempotency key must be unique per attempt. An order
            // id (and order number) can be reallocated after this transaction
            // rolls back, so a key derived from it is reused with different
            // metadata; Stripe then rejects the retry with IdempotencyException
            // and checkout can never complete. The 1:1 checkout idempotency
            // key already prevents duplicate orders, so the gateway key only
            // needs to make the SDK's own retries safe.
            $intent = $this->stripe->createPaymentIntent(
                $order->grand_total,
                (string) config('services.stripe.currency', 'usd'),
                [
                    'order_id' => (string) $order->id,
                    'order_number' => $order->order_number,
                    'user_id' => (string) $user->id,
                ],
                'order-'.$order->id.'-payment-'.Str::uuid()->toString(),
            );

            Payment::query()->create([
                'order_id' => $order->id,
                'provider' => 'stripe',
                'provider_payment_intent_id' => $intent['id'],
                'client_secret' => $intent['client_secret'],
                'amount' => $order->grand_total,
                'currency' => (string) config('services.stripe.currency', 'usd'),
                'status' => PaymentStatus::RequiresPaymentMethod,
            ]);

            // The cart has become an order; a retry must not charge it twice.
            $cart->items()->delete();
            $cart->forceFill(['coupon_id' => null])->save();

            $order->load(['items', 'latestPayment']);

            return [
                'order' => $order,
                'client_secret' => $order->latestPayment?->client_secret,
                'created' => true,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function idempotencyKey(User $user, array $data, ?string $provided): string
    {
        $provided = trim((string) $provided);

        if ($provided !== '') {
            return mb_substr($provided, 0, 100);
        }

        return 'auto-'.Str::uuid()->toString();
    }

    /**
     * @return array{order: Order, client_secret: string|null, created: bool}
     */
    private function resume(Order $order): array
    {
        $order->load(['items', 'latestPayment']);
        $clientSecret = $order->latestPayment?->client_secret;

        if ($clientSecret === null) {
            throw ValidationException::withMessages([
                'cart' => ['This checkout is already being processed.'],
            ]);
        }

        return ['order' => $order, 'client_secret' => $clientSecret, 'created' => false];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveCoupon(Cart $cart, array $data, User $user): ?Coupon
    {
        $code = $data['coupon_code'] ?? null;

        try {
            if (is_string($code) && trim($code) !== '') {
                $coupon = $this->coupons->find($code);
                $cart->forceFill(['coupon_id' => $coupon->id])->save();
            } elseif ($cart->coupon_id !== null) {
                $coupon = Coupon::query()->find($cart->coupon_id);

                if ($coupon === null) {
                    return null;
                }
            } else {
                return null;
            }

            $subtotal = $this->pricing->quote($cart, null)['totals']['subtotal'];
            $this->coupons->validate($coupon, $subtotal, $user);
        } catch (CouponException $e) {
            throw ValidationException::withMessages(['coupon_code' => [$e->getMessage()]]);
        }

        return $coupon;
    }
}
