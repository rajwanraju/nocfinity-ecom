<?php

namespace App\Exceptions;

use RuntimeException;

class StripeWebhookSignatureException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Invalid Stripe webhook signature.');
    }
}
