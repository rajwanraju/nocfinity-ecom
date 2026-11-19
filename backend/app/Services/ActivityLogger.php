<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * FR-ADMIN-10 (bonus): best-effort audit trail for privileged admin writes.
 * A logging failure is reported but never rolls back the business action.
 */
class ActivityLogger
{
    /**
     * @param  array<string, mixed>  $properties
     */
    public function log(
        string $action,
        ?Model $subject = null,
        ?string $description = null,
        array $properties = [],
    ): void {
        $request = request();

        rescue(function () use ($action, $subject, $description, $properties, $request): void {
            ActivityLog::query()->create([
                'user_id' => $request?->user()?->id,
                'action' => $action,
                'subject_type' => $subject?->getMorphClass(),
                'subject_id' => $subject?->getKey(),
                'description' => $description,
                'properties' => $properties === [] ? null : $properties,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent() !== null
                    ? mb_substr((string) $request->userAgent(), 0, 255)
                    : null,
            ]);
        }, report: true);
    }
}
