<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Guard-scoped permissions and the five required roles.
     *
     * @var list<string>
     */
    public const PERMISSIONS = [
        'products.view',
        'products.create',
        'products.edit',
        'products.delete',
        'categories.manage',
        'orders.view',
        'orders.update_status',
        'orders.cancel',
        'coupons.manage',
        'customers.view',
        'reports.view',
        'roles.manage',
        'staff.manage',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $roles = [
            'Super Admin' => self::PERMISSIONS,
            'Admin' => array_values(array_diff(self::PERMISSIONS, ['roles.manage', 'staff.manage'])),
            'Product Manager' => [
                'products.view',
                'products.create',
                'products.edit',
                'products.delete',
                'categories.manage',
                'reports.view',
            ],
            'Order Manager' => [
                'orders.view',
                'orders.update_status',
                'orders.cancel',
                'customers.view',
                'reports.view',
            ],
            'Support' => [
                'orders.view',
                'customers.view',
            ],
        ];

        foreach ($roles as $name => $permissions) {
            $role = Role::findOrCreate($name, 'web');
            $role->syncPermissions($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
