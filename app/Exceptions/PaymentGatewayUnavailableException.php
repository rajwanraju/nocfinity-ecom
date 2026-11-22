<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when the Stripe credentials are missing or unusable. Checkout must
 * fail with a controlled 503 instead of leaking an SDK error as a 500.
 */
final class PaymentGatewayUnavailableException extends RuntimeException
{
    public function __construct(string $message = 'Card payments are not available right now. Please contact support.')
    {
        parent::__construct($message);
    }
}
