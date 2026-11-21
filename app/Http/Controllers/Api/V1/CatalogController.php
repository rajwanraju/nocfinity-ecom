<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ProductIndexRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductSummaryResource;
use App\Services\CategoryService;
use App\Services\ProductService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function categories(CategoryService $categories): JsonResponse
    {
        return ApiResponse::success(
            CategoryResource::collection($categories->tree(activeOnly: true))->resolve(),
        );
    }

    public function products(ProductIndexRequest $request, ProductService $products): JsonResponse
    {
        $paginator = $products->publicIndex($request->validated());

        return ApiResponse::success(
            ProductSummaryResource::collection($paginator->items())->resolve(),
            'OK',
            ['pagination' => ApiResponse::paginationMeta($paginator)],
        );
    }

    public function product(string $slug, ProductService $products): JsonResponse
    {
        ['product' => $product, 'related' => $related] = $products->publicShow($slug);

        $data = (new ProductResource($product))->resolve();
        $data['related'] = ProductSummaryResource::collection($related)->resolve();

        return ApiResponse::success($data);
    }
}
