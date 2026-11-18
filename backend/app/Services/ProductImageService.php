<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProductImageService
{
    /**
     * FR-CAT-6: stored on the public disk with a random hashed filename.
     *
     * @param  array{alt?: string|null, is_primary?: bool, sort_order?: int}  $data
     */
    public function upload(Product $product, UploadedFile $file, array $data): ProductImage
    {
        $path = $file->store('products', 'public');

        return DB::transaction(function () use ($product, $path, $data): ProductImage {
            $isFirst = ProductImage::query()->where('product_id', $product->id)->doesntExist();
            $isPrimary = (bool) ($data['is_primary'] ?? false) || $isFirst;

            if ($isPrimary) {
                ProductImage::query()->where('product_id', $product->id)->update(['is_primary' => false]);
            }

            $sortOrder = $data['sort_order']
                ?? ((int) ProductImage::query()->where('product_id', $product->id)->max('sort_order') + 1);

            return ProductImage::query()->create([
                'product_id' => $product->id,
                'path' => $path,
                'alt' => $data['alt'] ?? null,
                'is_primary' => $isPrimary,
                'sort_order' => $sortOrder,
            ]);
        });
    }

    /**
     * @param  array{alt?: string|null, is_primary?: bool, sort_order?: int}  $data
     */
    public function update(Product $product, ProductImage $image, array $data): ProductImage
    {
        $this->assertBelongsTo($product, $image);

        if (($data['is_primary'] ?? false) === true) {
            ProductImage::query()
                ->where('product_id', $product->id)
                ->whereKeyNot($image->id)
                ->update(['is_primary' => false]);
        }

        $image->update($data);

        return $image->fresh();
    }

    /**
     * @param  list<int>  $orderedIds
     */
    public function reorder(Product $product, array $orderedIds): void
    {
        $existing = ProductImage::query()->where('product_id', $product->id)->pluck('id')->all();

        if (array_diff($orderedIds, $existing) !== [] || array_diff($existing, $orderedIds) !== []) {
            throw ValidationException::withMessages([
                'images' => ['The image list must contain exactly the images of this product.'],
            ]);
        }

        DB::transaction(function () use ($orderedIds): void {
            foreach ($orderedIds as $index => $id) {
                ProductImage::query()->whereKey($id)->update(['sort_order' => $index]);
            }
        });
    }

    public function delete(Product $product, ProductImage $image): void
    {
        $this->assertBelongsTo($product, $image);

        $wasPrimary = $image->is_primary;

        DB::transaction(function () use ($image): void {
            Storage::disk('public')->delete($image->path);
            $image->delete();
        });

        if ($wasPrimary) {
            $next = ProductImage::query()
                ->where('product_id', $product->id)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->first();

            $next?->update(['is_primary' => true]);
        }
    }

    private function assertBelongsTo(Product $product, ProductImage $image): void
    {
        abort_unless($image->product_id === $product->id, 404);
    }
}
