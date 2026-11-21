<?php

namespace App\Policies;

use App\Models\User;

/**
 * FR-RBAC-4 / FR-RBAC-8: target-level guards for the staff API. Route
 * permission middleware answers "may this actor manage staff at all"; the
 * policy answers "may this actor touch this particular account".
 */
class StaffPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->isStaff() && $actor->can('staff.manage');
    }

    public function view(User $actor, User $staff): bool
    {
        return $this->viewAny($actor) && $staff->isStaff();
    }

    public function create(User $actor): bool
    {
        return $this->viewAny($actor);
    }

    public function update(User $actor, User $staff): bool
    {
        return $this->view($actor, $staff)
            && ! $staff->isSuperAdmin()
            && ! $staff->is($actor);
    }

    public function delete(User $actor, User $staff): bool
    {
        return $this->update($actor, $staff);
    }
}
