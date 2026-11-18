<?php

namespace Database\Factories;

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => 'Password123!',
            'type' => UserType::Customer,
            'is_active' => true,
            'phone' => fake()->numerify('+1 555 0## ####'),
            'remember_token' => Str::random(10),
        ];
    }

    public function staff(): static
    {
        return $this->state(fn (): array => [
            'type' => UserType::Staff,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => [
            'is_active' => false,
        ]);
    }
}
