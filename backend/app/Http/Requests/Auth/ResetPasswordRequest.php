<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Auth\Concerns\NormalizesEmail;
use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    use NormalizesEmail;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'confirmed', PasswordRules::default()],
        ];
    }
}
