<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * The single response envelope used by every API endpoint.
 *
 * { success, message, data, meta, errors }
 */
final class ApiResponse
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public static function success(
        mixed $data = null,
        string $message = 'OK',
        array $meta = [],
        int $status = 200,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta === [] ? null : $meta,
            'errors' => null,
        ], $status);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public static function created(
        mixed $data = null,
        string $message = 'Created',
        array $meta = [],
    ): JsonResponse {
        return self::success($data, $message, $meta, 201);
    }

    public static function noContent(): JsonResponse
    {
        return response()->json(null, 204);
    }

    /**
     * @param  array<string, array<int, string>|string>  $errors
     * @param  array<string, mixed>  $meta
     */
    public static function error(
        string $message,
        array $errors = [],
        int $status = 400,
        array $meta = [],
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'meta' => $meta === [] ? null : $meta,
            'errors' => $errors === [] ? null : $errors,
        ], $status);
    }

    /**
     * Paginated collection response with FR-API-4 metadata.
     *
     * @param  array<string, mixed>  $pagination
     */
    public static function paginated(
        mixed $items,
        array $pagination,
        string $message = 'OK',
    ): JsonResponse {
        return self::success($items, $message, ['pagination' => $pagination]);
    }
}
