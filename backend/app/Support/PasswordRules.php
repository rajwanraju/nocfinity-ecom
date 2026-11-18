<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

/**
 * FR-AUTH-7: minimum 10 characters, mixed case, number, symbol and an
 * uncompromised-password check (HaveIBeenPwned). The pwned lookup can be
 * disabled only for isolated tests via auth.password_check_pwned.
 */
final class PasswordRules
{
    public static function default(): Password
    {
        $rule = Password::min(10)->mixedCase()->numbers()->symbols();

        if (config('auth.password_check_pwned', true)) {
            $rule->uncompromised();
        }

        return $rule;
    }
}
