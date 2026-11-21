<?php

namespace Database\Seeders;

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Demo credentials are documented in README.md.
     */
    public function run(): void
    {
        $staff = [
            ['Super Admin', 'admin@nocfinity.test', 'SuperAdmin123!', 'Super Admin'],
            ['Nora Admin', 'manager@nocfinity.test', 'Staff123!Pass', 'Admin'],
            ['Priya Product', 'products@nocfinity.test', 'Staff123!Pass', 'Product Manager'],
            ['Owen Orders', 'orders@nocfinity.test', 'Staff123!Pass', 'Order Manager'],
            ['Sam Support', 'support@nocfinity.test', 'Staff123!Pass', 'Support'],
        ];

        foreach ($staff as [$name, $email, $password, $role]) {
            $user = User::query()->updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => $password],
            );

            $user->forceFill([
                'type' => UserType::Staff,
                'is_active' => true,
                'email_verified_at' => now(),
            ])->save();

            $user->syncRoles([$role]);
        }

        $customers = [
            ['Casey Customer', 'customer@nocfinity.test', 'Customer123!'],
            ['Avery Morgan', 'avery@example.test', 'Customer123!'],
            ['Jordan Lee', 'jordan@example.test', 'Customer123!'],
            ['Remy Patel', 'remy@example.test', 'Customer123!'],
            ['Taylor Brooks', 'taylor@example.test', 'Customer123!'],
        ];

        foreach ($customers as [$name, $email, $password]) {
            $user = User::query()->updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => $password],
            );

            $user->forceFill([
                'type' => UserType::Customer,
                'is_active' => true,
                'email_verified_at' => now(),
            ])->save();

            $user->syncRoles([]);
        }
    }
}
