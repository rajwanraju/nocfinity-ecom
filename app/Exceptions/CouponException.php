<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A coupon failed a business rule (expired, inactive, limits, minimum).
 * Rendered as a 422 with the specific reason under the `code` field.
 */
class CouponException extends RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
