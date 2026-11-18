<?php

namespace App\Http\Requests\Admin;

use App\Support\PermissionRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
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
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:50',
                Rule::unique('roles', 'name')->ignore($this->route('role')),
            ],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => [
                'string',
                'distinct',
                Rule::in(PermissionRegistry::names()),
            ],
        ];
    }
}
