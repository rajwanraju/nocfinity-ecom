<?php

use App\Http\Controllers\Api\V1\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\PermissionController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\Admin\ProductImageController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\StaffController;
use App\Http\Controllers\Api\V1\Auth\CustomerAuthController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Auth\StaffAuthController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('api.health');

/*
|--------------------------------------------------------------------------
| Public catalog (P4)
|--------------------------------------------------------------------------
*/
Route::get('categories', [CatalogController::class, 'categories'])->name('api.categories.index');
Route::get('products', [CatalogController::class, 'products'])->name('api.products.index');
Route::get('products/{slug}', [CatalogController::class, 'product'])->name('api.products.show');

/*
|--------------------------------------------------------------------------
| Cart (P5): guest token or customer Sanctum token
|--------------------------------------------------------------------------
*/
Route::prefix('cart')->name('api.cart.')->group(function (): void {
    Route::get('/', [CartController::class, 'show'])->name('show');
    Route::delete('/', [CartController::class, 'clear'])->name('clear');

    Route::post('items', [CartController::class, 'storeItem'])->name('items.store');
    Route::patch('items/{item}', [CartController::class, 'updateItem'])->name('items.update');
    Route::delete('items/{item}', [CartController::class, 'destroyItem'])->name('items.destroy');

    // SEC-10: coupon attempts are limited per customer/IP.
    Route::middleware('throttle:coupon')->group(function (): void {
        Route::post('coupon', [CartController::class, 'applyCoupon'])->name('coupon.apply');
        Route::delete('coupon', [CartController::class, 'removeCoupon'])->name('coupon.remove');
    });
});

/*
|--------------------------------------------------------------------------
| Customer authentication
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->name('api.auth.')->group(function (): void {
    Route::post('register', [CustomerAuthController::class, 'register'])
        ->middleware('throttle:register')
        ->name('register');

    Route::post('login', [CustomerAuthController::class, 'login'])->name('login');

    Route::post('forgot-password', [PasswordResetController::class, 'forgot'])
        ->middleware('throttle:password-reset')
        ->name('password.forgot');

    Route::post('reset-password', [PasswordResetController::class, 'reset'])
        ->middleware('throttle:password-reset')
        ->name('password.reset');

    Route::middleware(['auth:sanctum', 'abilities:customer'])->group(function (): void {
        Route::get('me', [CustomerAuthController::class, 'me'])->name('me');
        Route::post('logout', [CustomerAuthController::class, 'logout'])->name('logout');
        Route::post('change-password', [CustomerAuthController::class, 'changePassword'])->name('password.change');
    });
});

/*
|--------------------------------------------------------------------------
| Staff authentication (separate endpoint and token ability)
|--------------------------------------------------------------------------
*/
Route::prefix('admin/auth')->name('api.admin.auth.')->group(function (): void {
    Route::post('login', [StaffAuthController::class, 'login'])->name('login');

    Route::middleware(['auth:sanctum', 'abilities:staff'])->group(function (): void {
        Route::get('me', [StaffAuthController::class, 'me'])->name('me');
        Route::post('logout', [StaffAuthController::class, 'logout'])->name('logout');
        Route::post('change-password', [StaffAuthController::class, 'changePassword'])->name('password.change');
    });
});

/*
|--------------------------------------------------------------------------
| Admin: roles, permission matrix and staff management (P3)
|--------------------------------------------------------------------------
|
| FR-RBAC-5: every route is gated by a permission, never by a role name.
| abilities:staff keeps customer tokens out before permissions are checked.
|
*/
Route::prefix('admin')->name('api.admin.')->middleware(['auth:sanctum', 'abilities:staff'])->group(function (): void {
    Route::get('permissions', PermissionController::class)
        ->middleware('permission:roles.manage')
        ->name('permissions.index');

    Route::apiResource('roles', RoleController::class)
        ->middleware('permission:roles.manage');

    Route::apiResource('staff', StaffController::class)
        ->except(['create', 'edit'])
        ->middleware('permission:staff.manage');

    /*
    | Catalog administration (P4). Explicit :id bindings keep admin URLs
    | stable even when a slug changes.
    */
    Route::get('categories', [AdminCategoryController::class, 'index'])
        ->middleware('permission:categories.manage')->name('categories.index');
    Route::post('categories', [AdminCategoryController::class, 'store'])
        ->middleware('permission:categories.manage')->name('categories.store');
    Route::get('categories/{category:id}', [AdminCategoryController::class, 'show'])
        ->middleware('permission:categories.manage')->name('categories.show');
    Route::match(['put', 'patch'], 'categories/{category:id}', [AdminCategoryController::class, 'update'])
        ->middleware('permission:categories.manage')->name('categories.update');
    Route::delete('categories/{category:id}', [AdminCategoryController::class, 'destroy'])
        ->middleware('permission:categories.manage')->name('categories.destroy');

    Route::get('products', [AdminProductController::class, 'index'])
        ->middleware('permission:products.view')->name('products.index');
    Route::post('products', [AdminProductController::class, 'store'])
        ->middleware('permission:products.create')->name('products.store');
    Route::get('products/{product:id}', [AdminProductController::class, 'show'])
        ->middleware('permission:products.view')->name('products.show');
    Route::match(['put', 'patch'], 'products/{product:id}', [AdminProductController::class, 'update'])
        ->middleware('permission:products.edit')->name('products.update');
    Route::delete('products/{product:id}', [AdminProductController::class, 'destroy'])
        ->middleware('permission:products.delete')->name('products.destroy');

    Route::post('products/{product:id}/images', [ProductImageController::class, 'store'])
        ->middleware('permission:products.edit')->name('products.images.store');
    Route::patch('products/{product:id}/images/reorder', [ProductImageController::class, 'reorder'])
        ->middleware('permission:products.edit')->name('products.images.reorder');
    Route::patch('products/{product:id}/images/{image}', [ProductImageController::class, 'update'])
        ->middleware('permission:products.edit')->name('products.images.update');
    Route::delete('products/{product:id}/images/{image}', [ProductImageController::class, 'destroy'])
        ->middleware('permission:products.edit')->name('products.images.destroy');
});
