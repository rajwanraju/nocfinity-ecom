<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Http\Requests\Catalog\AdminProductIndexRequest;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductSummaryResource;
use App\Models\Product;
use App\Services\ProductService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index(AdminProductIndexRequest $request, ProductService $products): JsonResponse
    {
        $paginator = $products->adminIndex($request->validated());

        return ApiResponse::success(
            ProductSummaryResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }

    public function store(StoreProductRequest $request, ProductService $products): JsonResponse
    {
        $product = $products->create($request->validated());

        return ApiResponse::created(new ProductResource($product), 'Product created.');
    }

    public function show(Product $product): JsonResponse
    {
        return ApiResponse::success(
            new ProductResource($product->load(['category', 'images', 'primaryImage'])),
        );
    }

    public function update(UpdateProductRequest $request, Product $product, ProductService $products): JsonResponse
    {
        $product = $products->update($product, $request->validated());

        return ApiResponse::success(new ProductResource($product), 'Product updated.');
    }

    public function destroy(Product $product, ProductService $products): JsonResponse
    {
        $products->delete($product);

        return ApiResponse::noContent();
    }
}
