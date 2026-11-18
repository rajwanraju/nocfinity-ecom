<?php

use App\Http\Controllers\Api\V1\Admin\PermissionController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\StaffController;
use App\Http\Controllers\Api\V1\Auth\CustomerAuthController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Auth\StaffAuthController;
use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('api.health');

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
});
