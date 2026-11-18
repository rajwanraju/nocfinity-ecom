<?php

namespace App\Exceptions;

use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * One central exception renderer for the whole JSON API (FR-API-5).
 * No stack traces or framework internals ever reach production clients.
 */
final class ApiExceptionHandler
{
    public static function register(Exceptions $exceptions): void
    {
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return match (true) {
                $e instanceof ValidationException => ApiResponse::error(
                    'The given data was invalid.',
                    $e->errors(),
                    422,
                ),
                $e instanceof AuthenticationException => ApiResponse::error(
                    'Unauthenticated.',
                    [],
                    401,
                ),
                $e instanceof InvalidCredentialsException => ApiResponse::error(
                    'Invalid credentials.',
                    [],
                    401,
                ),
                $e instanceof CouponException => ApiResponse::error(
                    'The given data was invalid.',
                    ['code' => [$e->getMessage()]],
                    422,
                ),
                $e instanceof LoginThrottledException => ApiResponse::error(
                    'Too many login attempts. Please try again later.',
                    [],
                    429,
                    ['retry_after' => $e->retryAfter],
                )->withHeaders(['Retry-After' => (string) $e->retryAfter]),
                $e instanceof AuthorizationException,
                $e instanceof AccessDeniedHttpException => ApiResponse::error(
                    'This action is unauthorized.',
                    [],
                    403,
                ),
                $e instanceof ModelNotFoundException => ApiResponse::error(
                    'Resource not found.',
                    [],
                    404,
                ),
                $e instanceof NotFoundHttpException => ApiResponse::error(
                    'Endpoint not found.',
                    [],
                    404,
                ),
                $e instanceof MethodNotAllowedHttpException => ApiResponse::error(
                    'Method not allowed.',
                    [],
                    405,
                ),
                $e instanceof ThrottleRequestsException => self::throttled($e),
                $e instanceof HttpExceptionInterface => ApiResponse::error(
                    $e->getMessage() !== '' ? $e->getMessage() : 'Request failed.',
                    [],
                    $e->getStatusCode(),
                    [],
                )->withHeaders($e->getHeaders()),
                default => self::serverError($e),
            };
        });
    }

    private static function throttled(ThrottleRequestsException $e): JsonResponse
    {
        return ApiResponse::error(
            'Too many attempts. Please try again later.',
            [],
            429,
            ['retry_after' => $e->getHeaders()['Retry-After'] ?? null],
        )->withHeaders($e->getHeaders());
    }

    private static function serverError(Throwable $e): JsonResponse
    {
        report($e);

        return ApiResponse::error(
            config('app.debug') ? $e->getMessage() : 'Server error. Please try again later.',
            [],
            500,
        );
    }
}
