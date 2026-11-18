<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'provider',
        'provider_payment_intent_id',
        'client_secret',
        'provider_charge_id',
        'provider_refund_id',
        'amount',
        'currency',
        'status',
        'stripe_event_id',
        'paid_at',
        'refunded_at',
        'failure_message',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'status' => PaymentStatus::class,
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    /**
     * @var list<string>
     */
    protected $hidden = [
        'client_secret',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
