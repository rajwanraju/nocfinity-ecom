<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = fake()->numberBetween(1000, 20000);

        return [
            'category_id' => Category::factory(),
            'name' => fake()->unique()->words(3, true),
            'slug' => fn (array $attributes): string => Str::slug($attributes['name']).'-'.Str::lower(Str::random(4)),
            'sku' => strtoupper(Str::random(8)),
            'description' => '<p>'.fake()->sentence().'</p>',
            'price' => $price,
            'discount_price' => null,
            'stock' => fake()->numberBetween(0, 30),
            'is_active' => true,
        ];
    }
}
