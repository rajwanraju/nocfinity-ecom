<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * @mixin User
 */
class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'orders_count' => $this->whenCounted('orders', fn (): int => (int) $this->orders_count, 0),
            'total_spent' => (int) ($this->total_spent ?? 0),
            'last_order_at' => $this->last_order_at !== null
                ? Carbon::parse($this->last_order_at)->toIso8601String()
                : null,
            'orders' => $this->whenLoaded('orders', fn (): array => $this->orders
                ->map(fn (Order $order): array => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status->value,
                    'grand_total' => $order->grand_total,
                    'items_count' => $order->items->sum('quantity'),
                    'placed_at' => $order->placed_at?->toIso8601String(),
                ])
                ->values()
                ->all()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
