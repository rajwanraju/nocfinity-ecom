<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Services\SettingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'price' => $this->price,
            'discount_price' => $this->discount_price,
            'current_price' => $this->currentPrice(),
            'has_discount' => $this->hasDiscount(),
            'stock' => $this->stock,
            'stock_status' => $this->stockStatus(
                app(SettingService::class)->integer('products.low_stock_threshold', 5),
            ),
            'is_active' => $this->is_active,
            'category' => $this->relationLoaded('category') && $this->category
                ? new CategoryResource($this->category)
                : null,
            'primary_image' => $this->relationLoaded('primaryImage') && $this->primaryImage
                ? new ProductImageResource($this->primaryImage)
                : null,
        ];
    }
}
