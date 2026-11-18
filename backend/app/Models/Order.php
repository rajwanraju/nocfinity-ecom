<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'user_id',
        'status',
        'subtotal',
        'discount_total',
        'shipping_total',
        'tax_total',
        'grand_total',
        'coupon_id',
        'coupon_code',
        'customer_name',
        'customer_email',
        'shipping_name',
        'shipping_phone',
        'shipping_line1',
        'shipping_line2',
        'shipping_city',
        'shipping_state',
        'shipping_postal_code',
        'shipping_country',
        'notes',
        'placed_at',
        'paid_at',
        'cancelled_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'subtotal' => 'integer',
            'discount_total' => 'integer',
            'shipping_total' => 'integer',
            'tax_total' => 'integer',
            'grand_total' => 'integer',
            'placed_at' => 'datetime',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function scopeStatus(Builder $query, OrderStatus|string $status): Builder
    {
        return $query->where('status', $status instanceof OrderStatus ? $status->value : $status);
    }

    public function isPending(): bool
    {
        return $this->status === OrderStatus::Pending;
    }

    public function isCancellable(): bool
    {
        return $this->status->isCancellable();
    }
}
