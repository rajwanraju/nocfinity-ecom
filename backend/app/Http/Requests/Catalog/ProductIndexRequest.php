<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductIndexRequest extends FormRequest
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
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:255'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0', 'gte:min_price'],
            'sort' => ['nullable', Rule::in(['price_asc', 'price_desc', 'newest'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:60'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
