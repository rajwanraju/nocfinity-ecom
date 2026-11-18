<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('shipping_country'))) {
            $this->merge(['shipping_country' => Str::upper($this->input('shipping_country'))]);
        }
    }

    /**
     * Only address data and an optional coupon code are accepted. Products,
     * quantities and prices always come from the server-side cart (FR-ORDER-2).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'shipping_name' => ['required', 'string', 'max:120'],
            'shipping_phone' => ['required', 'string', 'max:30'],
            'shipping_line1' => ['required', 'string', 'max:255'],
            'shipping_line2' => ['nullable', 'string', 'max:255'],
            'shipping_city' => ['required', 'string', 'max:120'],
            'shipping_state' => ['required', 'string', 'max:120'],
            'shipping_postal_code' => ['required', 'string', 'max:30'],
            'shipping_country' => ['required', 'string', 'size:2', 'alpha'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
        ];
    }
}
