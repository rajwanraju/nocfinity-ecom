<?php

namespace App\Enums;

enum UserType: string
{
    case Customer = 'customer';
    case Staff = 'staff';

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Customer',
            self::Staff => 'Staff',
        };
    }
}
