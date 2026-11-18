<?php

namespace App\Exceptions;

use RuntimeException;

class LoginThrottledException extends RuntimeException
{
    public function __construct(public readonly int $retryAfter)
    {
        parent::__construct('Too many login attempts.');
    }
}
