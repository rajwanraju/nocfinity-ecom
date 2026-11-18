<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('api.health');

// Public storefront and auth routes are registered in the phase that owns them.
Route::prefix('auth')->name('api.auth.')->group(function (): void {
    // P2
});
