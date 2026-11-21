<?php

namespace App\Services;

use App\Enums\SettingType;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * All pricing inputs (shipping, tax, thresholds) come from this service, never
 * from the client (SEC-1). Values are cached; writes bust the cache.
 */
class SettingService
{
    private const CACHE_KEY = 'settings:all';

    public function get(string $key, mixed $default = null): mixed
    {
        $settings = $this->all();

        return array_key_exists($key, $settings) ? $settings[$key] : $default;
    }

    public function integer(string $key, int $default = 0): int
    {
        $value = $this->get($key, $default);

        return is_numeric($value) ? (int) $value : $default;
    }

    public function boolean(string $key, bool $default = false): bool
    {
        $value = $this->get($key, $default);

        return is_bool($value) ? $value : filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? $default;
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function (): array {
            return Setting::query()
                ->get()
                ->mapWithKeys(function (Setting $setting): array {
                    $raw = (string) ($setting->value ?? '');
                    $type = $setting->type instanceof SettingType ? $setting->type : SettingType::String;

                    return [$setting->key => $setting->value === null ? null : $type->cast($raw)];
                })
                ->all();
        });
    }

    public function set(string $key, mixed $value, SettingType $type = SettingType::String, string $group = 'general'): void
    {
        Setting::query()->updateOrCreate(
            ['key' => $key],
            [
                'value' => match ($type) {
                    SettingType::Json => json_encode($value, JSON_THROW_ON_ERROR),
                    SettingType::Boolean => $value ? '1' : '0',
                    default => (string) $value,
                },
                'type' => $type,
                'group' => $group,
            ],
        );

        $this->flush();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
