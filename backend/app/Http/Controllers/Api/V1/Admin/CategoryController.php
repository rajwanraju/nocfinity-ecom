<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\CategoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(CategoryService $categories): JsonResponse
    {
        return ApiResponse::success(
            CategoryResource::collection($categories->tree())->resolve(),
        );
    }

    public function store(StoreCategoryRequest $request, CategoryService $categories): JsonResponse
    {
        $category = $categories->create($request->validated());

        return ApiResponse::created(new CategoryResource($category), 'Category created.');
    }

    public function show(Category $category): JsonResponse
    {
        return ApiResponse::success(new CategoryResource($category->load('children')));
    }

    public function update(UpdateCategoryRequest $request, Category $category, CategoryService $categories): JsonResponse
    {
        $category = $categories->update($category, $request->validated());

        return ApiResponse::success(new CategoryResource($category), 'Category updated.');
    }

    public function destroy(Category $category, CategoryService $categories): JsonResponse
    {
        $categories->delete($category);

        return ApiResponse::noContent();
    }
}
