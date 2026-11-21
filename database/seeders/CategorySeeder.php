<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            ['name' => 'Women', 'children' => [
                ['name' => 'Dresses', 'description' => 'Day-to-night silhouettes cut from silk, linen and crepe.'],
                ['name' => 'Tops', 'description' => 'Everyday layers and elevated basics.'],
                ['name' => 'Knitwear', 'description' => 'Softly structured knits for transitional weather.'],
            ]],
            ['name' => 'Men', 'children' => [
                ['name' => 'Shirts', 'description' => 'Crisp poplin, washed flannel and relaxed overshirts.'],
                ['name' => 'Trousers', 'description' => 'Pleated, tapered and relaxed fits.'],
                ['name' => 'Outerwear', 'description' => 'Wool coats and lightweight bombers.'],
            ]],
            ['name' => 'Accessories', 'children' => [
                ['name' => 'Bags', 'description' => 'Leather totes, mini bags and weekend carry.'],
                ['name' => 'Jewellery', 'description' => 'Quiet gold-tone pieces made for layering.'],
                ['name' => 'Footwear', 'description' => 'Loafers, sneakers and ballet flats.'],
                ['name' => 'Scarves', 'description' => 'Cotton scarves and wool beanies.'],
            ]],
        ];

        $sort = 0;

        foreach ($tree as $parentData) {
            $sort++;

            $parent = Category::query()->updateOrCreate(
                ['slug' => Str::slug($parentData['name'])],
                [
                    'parent_id' => null,
                    'name' => $parentData['name'],
                    'description' => null,
                    'is_active' => true,
                    'sort_order' => $sort,
                ],
            );

            $childSort = 0;

            foreach ($parentData['children'] as $childData) {
                $childSort++;

                Category::query()->updateOrCreate(
                    ['slug' => Str::slug($childData['name'])],
                    [
                        'parent_id' => $parent->id,
                        'name' => $childData['name'],
                        'description' => $childData['description'],
                        'is_active' => true,
                        'sort_order' => $childSort,
                    ],
                );
            }
        }
    }
}
