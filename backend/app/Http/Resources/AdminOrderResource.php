<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class AdminOrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status->value,
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'shipping_total' => $this->shipping_total,
            'tax_total' => $this->tax_total,
            'grand_total' => $this->grand_total,
            'coupon_code' => $this->coupon_code,
            'customer' => $this->whenLoaded('user', fn (): array => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'shipping' => [
                'name' => $this->shipping_name,
                'phone' => $this->shipping_phone,
                'line1' => $this->shipping_line1,
                'line2' => $this->shipping_line2,
                'city' => $this->shipping_city,
                'state' => $this->shipping_state,
                'postal_code' => $this->shipping_postal_code,
                'country' => $this->shipping_country,
            ],
            'notes' => $this->notes,
            'payment_status' => $this->whenLoaded(
                'latestPayment',
                fn (): ?string => $this->latestPayment?->status->value,
            ),
            'items' => $this->whenLoaded(
                'items',
                fn (): array => OrderItemResource::collection($this->items)->resolve(),
                [],
            ),
            'status_history' => $this->whenLoaded(
                'statusHistories',
                fn (): array => $this->statusHistories
                    ->map(fn (OrderStatusHistory $history): array => [
                        'from_status' => $history->from_status?->value,
                        'to_status' => $history->to_status->value,
                        'note' => $history->note,
                        'changed_by' => $history->changed_by,
                        'created_at' => $history->created_at?->toIso8601String(),
                    ])
                    ->values()
                    ->all(),
                [],
            ),
            'valid_transitions' => array_values(array_map(
                fn (OrderStatus $status): string => $status->value,
                array_filter(
                    $this->status->allowedTransitions(),
                    fn (OrderStatus $status): bool => $status !== OrderStatus::Paid,
                ),
            )),
            'placed_at' => $this->placed_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
