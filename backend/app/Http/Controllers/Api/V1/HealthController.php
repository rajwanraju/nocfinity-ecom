<?php

namespace App\Http\Controllers\Api\V1;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * OPS-3: public health check used by Docker/CI and uptime monitors.
 * It exposes no configuration details or secrets.
 */
final class HealthController
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->databaseIsUp(),
            'cache' => $this->cacheIsUp(),
        ];

        $healthy = ! in_array(false, $checks, true);

        $data = [
            'status' => $healthy ? 'ok' : 'degraded',
            'service' => config('app.name'),
            'environment' => app()->environment(),
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ];

        if (! $healthy) {
            return ApiResponse::error('Service unhealthy', [], 503, $data);
        }

        return ApiResponse::success($data, 'Service healthy');
    }

    private function databaseIsUp(): bool
    {
        try {
            DB::select('SELECT 1');

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }

    private function cacheIsUp(): bool
    {
        try {
            Cache::put('health:check', 'ok', 10);

            return Cache::get('health:check') === 'ok';
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }
}
