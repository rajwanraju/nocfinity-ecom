<?php

namespace App\Providers;

use App\Models\User;
use App\Policies\StaffPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiters();
        $this->configureAuthorization();
    }

    /**
     * D8 / FR-RBAC-4: Super Admin bypasses permission checks. Policy abilities
     * use bare names (view, update, delete) and must keep their target-level
     * guards, so only namespaced permission abilities are short-circuited.
     */
    private function configureAuthorization(): void
    {
        Gate::policy(User::class, StaffPolicy::class);

        Gate::before(function (?User $user, string $ability): ?bool {
            if ($user === null) {
                return null;
            }

            return $user->isSuperAdmin() && str_contains($ability, '.') ? true : null;
        });
    }

    /**
     * SEC-10: named limiters referenced by route middleware.
     * Login has its own stricter, email+IP aware limiter in P2.
     */
    private function configureRateLimiters(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)
            ->by($request->user()?->getKey() ?? $request->ip()));

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('register', fn (Request $request) => Limit::perHour(10)->by($request->ip()));

        RateLimiter::for('password-reset', fn (Request $request) => Limit::perHour(5)->by($request->ip()));

        RateLimiter::for('coupon', fn (Request $request) => Limit::perMinute(20)
            ->by($request->user()?->getKey() ?? $request->ip()));

        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->getKey() ?? $request->ip()));
    }
}
