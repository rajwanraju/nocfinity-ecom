<?php

namespace App\Support;

/**
 * FR-RBAC-2 / FR-RBAC-7: the single source of truth for permission names and
 * how the admin matrix groups them.
 */
final class PermissionRegistry
{
    /**
     * @var array<string, array{label: string, permissions: array<string, string>}>
     */
    public const GROUPS = [
        'catalog' => [
            'label' => 'Catalog',
            'permissions' => [
                'products.view' => 'View products',
                'products.create' => 'Create products',
                'products.edit' => 'Edit products',
                'products.delete' => 'Delete products',
                'categories.manage' => 'Manage categories',
            ],
        ],
        'orders' => [
            'label' => 'Orders',
            'permissions' => [
                'orders.view' => 'View orders',
                'orders.update_status' => 'Update order status',
                'orders.cancel' => 'Cancel orders',
            ],
        ],
        'marketing' => [
            'label' => 'Marketing',
            'permissions' => [
                'coupons.manage' => 'Manage coupons',
            ],
        ],
        'customers' => [
            'label' => 'Customers',
            'permissions' => [
                'customers.view' => 'View customers',
            ],
        ],
        'reports' => [
            'label' => 'Reports',
            'permissions' => [
                'reports.view' => 'View reports',
            ],
        ],
        'administration' => [
            'label' => 'Administration',
            'permissions' => [
                'roles.manage' => 'Manage roles and permissions',
                'staff.manage' => 'Manage staff',
            ],
        ],
    ];

    /**
     * @return list<string>
     */
    public static function names(): array
    {
        return array_merge(...array_map(
            fn (array $group): array => array_keys($group['permissions']),
            array_values(self::GROUPS),
        ));
    }

    /**
     * @return list<array{key: string, label: string, permissions: list<array{name: string, label: string}>}>
     */
    public static function grouped(): array
    {
        $groups = [];

        foreach (self::GROUPS as $key => $group) {
            $permissions = [];

            foreach ($group['permissions'] as $name => $label) {
                $permissions[] = ['name' => $name, 'label' => $label];
            }

            $groups[] = [
                'key' => $key,
                'label' => $group['label'],
                'permissions' => $permissions,
            ];
        }

        return $groups;
    }
}
