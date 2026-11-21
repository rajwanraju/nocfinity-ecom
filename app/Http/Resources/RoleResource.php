<?php

namespace App\Http\Resources;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Role
 */
class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'is_system' => $this->name === User::SUPER_ADMIN_ROLE,
            'permissions' => $this->whenLoaded(
                'permissions',
                fn (): array => $this->permissions->pluck('name')->sort()->values()->all(),
                [],
            ),
            'staff_count' => (int) ($this->users_count ?? 0),
        ];
    }
}
