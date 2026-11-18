<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * @var list<array{name: string, sku: string, category: string, price: int, discount: int|null, stock: int, active: bool, description: string}>
     */
    private array $products = [
        ['name' => 'Aurelia Silk Slip Dress', 'sku' => 'NOC-0001', 'category' => 'dresses', 'price' => 18900, 'discount' => 14900, 'stock' => 18, 'active' => true, 'description' => 'Bias-cut silk slip dress with adjustable straps and a fluid, floor-skimming drape. Fully lined.'],
        ['name' => 'Margot Linen Midi Dress', 'sku' => 'NOC-0002', 'category' => 'dresses', 'price' => 12900, 'discount' => null, 'stock' => 12, 'active' => true, 'description' => 'Relaxed midi dress in washed European linen with a soft square neckline and side pockets.'],
        ['name' => 'Isla Wrap Dress', 'sku' => 'NOC-0003', 'category' => 'dresses', 'price' => 15900, 'discount' => 12900, 'stock' => 4, 'active' => true, 'description' => 'A true wrap dress in crepe with a self-tie waist and a gently flared skirt.'],
        ['name' => 'Noa Ribbed Tank', 'sku' => 'NOC-0004', 'category' => 'tops', 'price' => 3900, 'discount' => null, 'stock' => 40, 'active' => true, 'description' => 'Fine-rib cotton tank with a scooped neckline. Designed to layer or stand alone.'],
        ['name' => 'Elise Poplin Shirt', 'sku' => 'NOC-0005', 'category' => 'tops', 'price' => 7900, 'discount' => 5900, 'stock' => 22, 'active' => true, 'description' => 'Crisp organic-cotton poplin shirt with a relaxed body and mother-of-pearl buttons.'],
        ['name' => 'June Cropped Cardigan', 'sku' => 'NOC-0006', 'category' => 'knitwear', 'price' => 8900, 'discount' => null, 'stock' => 0, 'active' => true, 'description' => 'Cropped cardigan in a soft cotton blend with a round neck and tonal buttons.'],
        ['name' => 'Vera Cashmere Sweater', 'sku' => 'NOC-0007', 'category' => 'knitwear', 'price' => 21900, 'discount' => 17900, 'stock' => 7, 'active' => true, 'description' => 'Grade-A Mongolian cashmere crew neck with a relaxed fit and ribbed trims.'],
        ['name' => 'Atlas Oxford Shirt', 'sku' => 'NOC-0008', 'category' => 'shirts', 'price' => 9900, 'discount' => null, 'stock' => 25, 'active' => true, 'description' => 'Classic Oxford shirt in heavyweight cotton with a button-down collar and single chest pocket.'],
        ['name' => 'Rowan Flannel Overshirt', 'sku' => 'NOC-0009', 'category' => 'shirts', 'price' => 11900, 'discount' => 8900, 'stock' => 9, 'active' => true, 'description' => 'Brushed cotton flannel overshirt with a boxy cut, ideal as a light outer layer.'],
        ['name' => 'Felix Pleated Trouser', 'sku' => 'NOC-0010', 'category' => 'trousers', 'price' => 10900, 'discount' => null, 'stock' => 16, 'active' => true, 'description' => 'Single-pleat trouser in a fluid wool blend with a tapered leg and side adjusters.'],
        ['name' => 'Miles Relaxed Chino', 'sku' => 'NOC-0011', 'category' => 'trousers', 'price' => 8900, 'discount' => 6900, 'stock' => 30, 'active' => true, 'description' => 'Garment-dyed cotton chino with a relaxed straight leg and a clean front.'],
        ['name' => 'Harbor Wool Coat', 'sku' => 'NOC-0012', 'category' => 'outerwear', 'price' => 32900, 'discount' => 27900, 'stock' => 3, 'active' => true, 'description' => 'Double-faced wool coat with a concealed placket, dropped shoulders and deep pockets.'],
        ['name' => 'Kane Bomber Jacket', 'sku' => 'NOC-0013', 'category' => 'outerwear', 'price' => 18900, 'discount' => null, 'stock' => 11, 'active' => true, 'description' => 'Lightweight bomber in matte recycled nylon with ribbed cuffs and a two-way zip.'],
        ['name' => 'Sable Leather Tote', 'sku' => 'NOC-0014', 'category' => 'bags', 'price' => 24900, 'discount' => 19900, 'stock' => 6, 'active' => true, 'description' => 'Structured tote in vegetable-tanned leather with a suede lining and magnetic closure.'],
        ['name' => 'Mini Crescent Bag', 'sku' => 'NOC-0015', 'category' => 'bags', 'price' => 9900, 'discount' => null, 'stock' => 14, 'active' => true, 'description' => 'Curved shoulder bag in smooth leather with an adjustable strap and zip-top closure.'],
        ['name' => 'Canvas Weekender', 'sku' => 'NOC-0016', 'category' => 'bags', 'price' => 13900, 'discount' => null, 'stock' => 8, 'active' => true, 'description' => 'Waxed canvas weekender with leather handles, a detachable strap and a shoe compartment.'],
        ['name' => 'Sol Gold Hoops', 'sku' => 'NOC-0017', 'category' => 'jewellery', 'price' => 4900, 'discount' => null, 'stock' => 50, 'active' => true, 'description' => 'Pair of 18k gold-plated hoops with a lightweight hollow construction.'],
        ['name' => 'Linea Chain Necklace', 'sku' => 'NOC-0018', 'category' => 'jewellery', 'price' => 6900, 'discount' => 5500, 'stock' => 20, 'active' => true, 'description' => 'Fine gold-plated chain necklace with a lobster clasp and an adjustable length.'],
        ['name' => 'Orion Signet Ring', 'sku' => 'NOC-0019', 'category' => 'jewellery', 'price' => 5900, 'discount' => null, 'stock' => 0, 'active' => true, 'description' => 'Solid brass signet ring with a brushed finish and a subtly engraved face.'],
        ['name' => 'Studio Leather Loafers', 'sku' => 'NOC-0020', 'category' => 'footwear', 'price' => 17900, 'discount' => 14900, 'stock' => 13, 'active' => true, 'description' => 'Hand-finished leather loafers with a stacked heel and a flexible leather sole.'],
        ['name' => 'Terrace Canvas Sneaker', 'sku' => 'NOC-0021', 'category' => 'footwear', 'price' => 9900, 'discount' => null, 'stock' => 35, 'active' => true, 'description' => 'Low-profile canvas sneaker with a vulcanised rubber sole and cotton laces.'],
        ['name' => 'Meadow Ballet Flat', 'sku' => 'NOC-0022', 'category' => 'footwear', 'price' => 12900, 'discount' => 9900, 'stock' => 5, 'active' => true, 'description' => 'Soft nappa ballet flat with a square toe and an elasticated back.'],
        ['name' => 'Cast Cotton Scarf', 'sku' => 'NOC-0023', 'category' => 'scarves', 'price' => 3900, 'discount' => null, 'stock' => 26, 'active' => true, 'description' => 'Lightweight cotton scarf with a hand-rolled edge and a muted tonal check.'],
        ['name' => 'Ember Wool Beanie', 'sku' => 'NOC-0024', 'category' => 'scarves', 'price' => 2900, 'discount' => 1900, 'stock' => 18, 'active' => true, 'description' => 'Rib-knit merino beanie with a double-folded brim for extra warmth.'],
        ['name' => 'Archive Silk Blouse', 'sku' => 'NOC-0025', 'category' => 'tops', 'price' => 8900, 'discount' => null, 'stock' => 10, 'active' => false, 'description' => 'Archive silk blouse with a concealed placket. Kept inactive for catalogue testing.'],
        ['name' => 'Sample Suede Jacket', 'sku' => 'NOC-0026', 'category' => 'outerwear', 'price' => 24900, 'discount' => null, 'stock' => 2, 'active' => false, 'description' => 'Sample suede jacket, not part of the public catalogue.'],
    ];

    public function run(): void
    {
        $categories = Category::query()->get()->keyBy('slug');

        foreach ($this->products as $index => $data) {
            $category = $categories->get($data['category']);

            if (! $category) {
                continue;
            }

            $product = Product::query()->updateOrCreate(
                ['sku' => $data['sku']],
                [
                    'category_id' => $category->id,
                    'name' => $data['name'],
                    'slug' => Str::slug($data['name']),
                    'description' => $data['description'],
                    'price' => $data['price'],
                    'discount_price' => $data['discount'],
                    'stock' => $data['stock'],
                    'is_active' => $data['active'],
                ],
            );

            $primary = $this->copyImage($index + 1);

            if ($product->images()->doesntExist()) {
                ProductImage::query()->create([
                    'product_id' => $product->id,
                    'path' => $primary,
                    'alt' => $data['name'],
                    'is_primary' => true,
                    'sort_order' => 1,
                ]);
            }

            // A few products get a second gallery image.
            if (in_array($index, [0, 1, 13, 19], true) && $product->images()->count() < 2) {
                ProductImage::query()->create([
                    'product_id' => $product->id,
                    'path' => $this->copyImage(27 + ($index % 2)),
                    'alt' => $data['name'].' — alternate view',
                    'is_primary' => false,
                    'sort_order' => 2,
                ]);
            }
        }

        $this->assignCategoryImages();
    }

    private function copyImage(int $number): string
    {
        $filename = sprintf('product-%02d.jpg', $number);
        $source = database_path('seeders/assets/products/'.$filename);
        $path = 'products/'.$filename;

        if (! Storage::disk('public')->exists($path)) {
            Storage::disk('public')->put($path, file_get_contents($source));
        }

        return $path;
    }

    private function assignCategoryImages(): void
    {
        $map = [
            'women' => 'NOC-0001',
            'men' => 'NOC-0008',
            'accessories' => 'NOC-0014',
        ];

        foreach ($map as $slug => $sku) {
            $image = Product::query()->where('sku', $sku)->first()?->primaryImage;

            if ($image) {
                Category::query()->where('slug', $slug)->update(['image_path' => $image->path]);
            }
        }
    }
}
