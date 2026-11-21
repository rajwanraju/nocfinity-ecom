<?php

namespace App\Http\Requests\Cart;

use Illuminate\Foundation\Http\FormRequest;

class AddCartItemRequest extends FormRequest
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
            'product_id' => ['required', 'integer', 'exists:products,id'],
            // The effective maximum depends on stock and settings; the service
            // checks it and returns a precise message.
            'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
        ];
    }
}
