<?php

namespace App\Services;

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class StaffService
{
    /**
     * @param  array{search?: string|null, role?: string|null, status?: string|null}  $filters
     */
    public function paginate(array $filters): LengthAwarePaginator
    {
        return User::query()
            ->where('type', UserType::Staff)
            ->with(['roles.permissions'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query
                ->whereHas('roles', fn (Builder $roles) => $roles->where('name', $role)))
            ->when(($filters['status'] ?? null) === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when(($filters['status'] ?? null) === 'inactive', fn (Builder $query) => $query->where('is_active', false))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();
    }

    /**
     * @param  array{name: string, email: string, password: string, phone?: string|null, roles: list<string>, is_active?: bool}  $data
     */
    public function create(array $data, User $actor): User
    {
        $this->assertCanAssignRoles($data['roles'], $actor);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
        ]);

        // Privileged fields are never taken from request input (SEC-6).
        $user->forceFill([
            'type' => UserType::Staff,
            'is_active' => $data['is_active'] ?? true,
        ])->save();

        $user->syncRoles($data['roles']);

        return $this->refresh($user);
    }

    /**
     * @param  array{name?: string, email?: string, phone?: string|null, password?: string|null, roles?: list<string>, is_active?: bool}  $data
     */
    public function update(User $staff, array $data, User $actor): User
    {
        $this->assertManageable($staff, $actor);

        if (isset($data['roles'])) {
            $this->assertCanAssignRoles($data['roles'], $actor);
        }

        $staff->fill(array_intersect_key($data, array_flip(['name', 'email', 'phone'])));

        if (! empty($data['password'])) {
            $staff->password = $data['password'];
        }

        if (array_key_exists('is_active', $data)) {
            $staff->is_active = $data['is_active'];
        }

        $staff->save();

        if (isset($data['roles'])) {
            $staff->syncRoles($data['roles']);
        }

        // Deactivated or password-reset accounts lose every active session.
        if (($data['is_active'] ?? true) === false || ! empty($data['password'])) {
            $staff->tokens()->delete();
        }

        return $this->refresh($staff);
    }

    /**
     * FR-RBAC-8: staff are deactivated rather than deleted so order and
     * activity history keeps a valid user reference.
     */
    public function deactivate(User $staff, User $actor): void
    {
        $this->assertManageable($staff, $actor);

        $staff->forceFill(['is_active' => false])->save();
        $staff->tokens()->delete();
    }

    /**
     * FR-RBAC-4: Super Admin accounts are immutable through the staff API,
     * which also guarantees the last Super Admin can never be removed.
     */
    private function assertManageable(User $staff, User $actor): void
    {
        if ($staff->isSuperAdmin()) {
            throw new AuthorizationException('Super Admin accounts cannot be modified.');
        }

        if ($staff->is($actor)) {
            throw new AuthorizationException('You cannot modify your own staff account.');
        }
    }

    /**
     * Privilege escalation guard: only a Super Admin may hand out the
     * Super Admin role.
     *
     * @param  list<string>  $roles
     */
    private function assertCanAssignRoles(array $roles, User $actor): void
    {
        if (in_array(User::SUPER_ADMIN_ROLE, $roles, true) && ! $actor->isSuperAdmin()) {
            throw new AuthorizationException('Only a Super Admin can assign the Super Admin role.');
        }
    }

    private function refresh(User $user): User
    {
        return $user->fresh(['roles.permissions']);
    }
}
