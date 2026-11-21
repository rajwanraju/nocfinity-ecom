<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * @mixin User
 */
class StaffResource extends UserResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'roles' => $this->getRoleNames()->values(),
            // FR-RBAC-6: the UI hides menus based on this list; the API is
            // still the final authority on every request.
            'permissions' => $this->getAllPermissions()->pluck('name')->sort()->values(),
        ];
    }
}
