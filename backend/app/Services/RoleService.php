<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RoleService
{
    /**
     * @return Collection<int, Role>
     */
    public function roles(): Collection
    {
        return Role::query()
            ->with('permissions')
            ->withCount('users')
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  array{name: string, permissions?: list<string>}  $data
     */
    public function create(array $data): Role
    {
        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);

        return $this->refresh($role);
    }

    /**
     * @param  array{name?: string, permissions?: list<string>}  $data
     */
    public function update(Role $role, array $data): Role
    {
        $this->assertMutable($role);

        if (isset($data['name'])) {
            $role->update(['name' => $data['name']]);
        }

        if (array_key_exists('permissions', $data)) {
            $role->syncPermissions($data['permissions']);
        }

        return $this->refresh($role);
    }

    public function delete(Role $role): void
    {
        $this->assertMutable($role);

        if ($role->users()->exists()) {
            throw new ConflictHttpException('This role is assigned to staff and cannot be deleted.');
        }

        $role->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * FR-RBAC-4: the Super Admin role is owned by the system and cannot be
     * renamed, have permissions removed or be deleted by anyone.
     */
    private function assertMutable(Role $role): void
    {
        if ($role->name === User::SUPER_ADMIN_ROLE) {
            throw new AuthorizationException('The Super Admin role cannot be modified.');
        }
    }

    private function refresh(Role $role): Role
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $role->fresh(['permissions'])->loadCount('users');
    }
}
