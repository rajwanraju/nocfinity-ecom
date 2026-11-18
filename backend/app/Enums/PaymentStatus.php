<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case RequiresPaymentMethod = 'requires_payment_method';
    case RequiresConfirmation = 'requires_confirmation';
    case RequiresAction = 'requires_action';
    case Processing = 'processing';
    case Succeeded = 'succeeded';
    case Canceled = 'canceled';
    case Failed = 'failed';
    case Refunded = 'refunded';

    public function label(): string
    {
        return str_replace('_', ' ', ucfirst($this->value));
    }

    public function isSuccessful(): bool
    {
        return $this === self::Succeeded;
    }
}
