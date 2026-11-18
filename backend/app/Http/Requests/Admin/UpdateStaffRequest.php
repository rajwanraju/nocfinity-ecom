<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Auth\Concerns\NormalizesEmail;
use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email:rfc',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->route('staff')),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'password' => ['sometimes', 'nullable', 'string', 'confirmed', PasswordRules::default()],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string', 'distinct', 'exists:roles,name'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
