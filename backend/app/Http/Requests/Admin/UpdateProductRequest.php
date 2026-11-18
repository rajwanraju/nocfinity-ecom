<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
            'category_id' => ['sometimes', 'required', 'integer', Rule::exists('categories', 'id')->whereNull('deleted_at')],
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'slug')->ignore($this->route('product')),
            ],
            'sku' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:100',
                Rule::unique('products', 'sku')->ignore($this->route('product')),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'price' => ['sometimes', 'required', 'integer', 'min:0'],
            'discount_price' => ['sometimes', 'nullable', 'integer', 'min:0', 'lt:price'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Price is merged so `lt:price` still has something to compare when only
     * the discount price changes.
     */
    protected function prepareForValidation(): void
    {
        /** @var Product|null $product */
        $product = $this->route('product');

        if ($product instanceof Product && ! $this->has('price') && $this->has('discount_price')) {
            $this->merge(['price' => $product->price]);
        }
    }
}
