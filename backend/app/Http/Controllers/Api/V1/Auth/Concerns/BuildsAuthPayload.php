<?php

namespace App\Http\Controllers\Api\V1\Auth\Concerns;

use App\Http\Resources\StaffResource;
use App\Http\Resources\UserResource;
use App\Models\User;

trait BuildsAuthPayload
{
    /**
     * @param  array{user: User, token: string, abilities: list<string>}  $result
     * @return array<string, mixed>
     */
    protected function authPayload(array $result, bool $staff = false): array
    {
        if ($staff) {
            $result['user']->loadMissing('roles.permissions');
        }

        return [
            'user' => $staff
                ? new StaffResource($result['user'])
                : new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'abilities' => $result['abilities'],
        ];
    }
}
