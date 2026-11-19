<?php

namespace App\Http\Requests\Admin;

use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => Str::upper(trim($this->input('code')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $coupon = $this->route('coupon');
        $ignore = $coupon instanceof Coupon ? $coupon->id : null;

        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('coupons', 'code')->ignore($ignore)],
            'type' => ['required', Rule::enum(CouponType::class)],
            'value' => [
                'required',
                'integer',
                'min:1',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($this->input('type') === CouponType::Percentage->value && (int) $value > 100) {
                        $fail('A percentage coupon cannot exceed 100.');
                    }
                },
            ],
            'min_order_amount' => ['nullable', 'integer', 'min:0'],
            'max_discount_amount' => ['nullable', 'integer', 'min:1'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => array_values(array_filter([
                'nullable',
                'date',
                $this->filled('starts_at') ? 'after:starts_at' : null,
            ])),
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
