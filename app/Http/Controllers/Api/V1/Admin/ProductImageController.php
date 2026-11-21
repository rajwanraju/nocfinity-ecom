<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderProductImagesRequest;
use App\Http\Requests\Admin\StoreProductImageRequest;
use App\Http\Requests\Admin\UpdateProductImageRequest;
use App\Http\Resources\ProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ProductImageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ProductImageController extends Controller
{
    public function store(StoreProductImageRequest $request, Product $product, ProductImageService $images): JsonResponse
    {
        $image = $images->upload($product, $request->file('image'), $request->validated());

        return ApiResponse::created(new ProductImageResource($image), 'Image uploaded.');
    }

    public function update(
        UpdateProductImageRequest $request,
        Product $product,
        ProductImage $image,
        ProductImageService $images,
    ): JsonResponse {
        $image = $images->update($product, $image, $request->validated());

        return ApiResponse::success(new ProductImageResource($image), 'Image updated.');
    }

    public function reorder(
        ReorderProductImagesRequest $request,
        Product $product,
        ProductImageService $images,
    ): JsonResponse {
        $images->reorder($product, $request->validated('images'));

        return ApiResponse::success(null, 'Images reordered.');
    }

    public function destroy(Product $product, ProductImage $image, ProductImageService $images): JsonResponse
    {
        $images->delete($product, $image);

        return ApiResponse::noContent();
    }
}
