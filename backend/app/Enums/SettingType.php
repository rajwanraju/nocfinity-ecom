<?php

namespace App\Enums;

enum SettingType: string
{
    case String = 'string';
    case Integer = 'integer';
    case Boolean = 'boolean';
    case Json = 'json';

    public function cast(string $value): mixed
    {
        return match ($this) {
            self::String => $value,
            self::Integer => (int) $value,
            self::Boolean => filter_var($value, FILTER_VALIDATE_BOOL),
            self::Json => json_decode($value, true, flags: JSON_THROW_ON_ERROR),
        };
    }
}
