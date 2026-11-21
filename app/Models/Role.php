<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Spatie's Role::users() resolves the user model from the current default
 * guard, which becomes "sanctum" after token authentication. That guard has
 * no provider and breaks withCount/loadCount. The explicit relation keeps
 * role staff counts working on every admin request.
 */
class Role extends SpatieRole
{
    public function users(): BelongsToMany
    {
        return $this->morphedByMany(
            User::class,
            'model',
            config('permission.table_names.model_has_roles'),
            'role_id',
            config('permission.column_names.model_morph_key', 'model_id'),
        );
    }
}
