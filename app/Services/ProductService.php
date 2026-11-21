<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Support\HtmlSanitizer;
use App\Support\Slug;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProductService
{
    /** Effective price, matching Product::currentPrice() even for bad legacy rows. */
    private const PRICE_EXPR = 'CASE WHEN discount_price IS NOT NULL AND discount_price < price THEN discount_price ELSE price END';

    /**
     * FR-CAT-3: public list with search, category subtree, effective-price
     * range, on-sale filter, sorting and pagination.
     *
     * @param  array<string, mixed>  $filters
     */
    public function publicIndex(array $filters): LengthAwarePaginator
    {
        $query = $this->publicQuery()->with(['category', 'primaryImage']);

        $this->applySearch($query, $filters['search'] ?? null);

        if (! empty($filters['category'])) {
            $category = Category::query()->where('slug', $filters['category'])->firstOrFail();
            $query->whereIn('category_id', app(CategoryService::class)->descendantIds($category));
        }

        $this->applyPriceRange($query, $filters);

        if (filter_var($filters['on_sale'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereNotNull('discount_price')->whereRaw('discount_price < price');
        }

        $this->applySort($query, $filters['sort'] ?? 'newest');

        return $query->paginate((int) ($filters['per_page'] ?? 12))->withQueryString();
    }

    /**
     * FR-CAT-4: detail plus related products from the same category.
     *
     * @return array{product: Product, related: Collection<int, Product>}
     */
    public function publicShow(string $slug): array
    {
        $product = $this->publicQuery()
            ->where('slug', $slug)
            ->with(['category', 'images', 'primaryImage'])
            ->firstOrFail();

        $related = $this->publicQuery()
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->with(['category', 'primaryImage'])
            ->latest('id')
            ->limit(4)
            ->get();

        return ['product' => $product, 'related' => $related];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function adminIndex(array $filters): LengthAwarePaginator
    {
        $query = Product::query()->with(['category', 'primaryImage']);

        $this->applySearch($query, $filters['search'] ?? null);

        $query->when($filters['category_id'] ?? null, fn (Builder $query, int|string $id) => $query->where('category_id', $id));

        $query->when(($filters['status'] ?? null) === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when(($filters['status'] ?? null) === 'inactive', fn (Builder $query) => $query->where('is_active', false));

        return $query->latest('id')->paginate((int) ($filters['per_page'] ?? 15))->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Product
    {
        $data['slug'] = $data['slug'] ?? Slug::uniqueFor($data['name'], Product::class);
        $data['description'] = HtmlSanitizer::clean($data['description'] ?? null);
        $data['is_active'] ??= true;

        return Product::query()->create($data)->load(['category', 'images', 'primaryImage']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Product $product, array $data): Product
    {
        $price = (int) ($data['price'] ?? $product->price);
        $discount = array_key_exists('discount_price', $data)
            ? $data['discount_price']
            : $product->discount_price;

        if ($discount !== null && (int) $discount >= $price) {
            throw ValidationException::withMessages([
                'discount_price' => ['The discount price must be lower than the price.'],
            ]);
        }

        if (isset($data['name']) && $data['name'] !== $product->name && ! isset($data['slug'])) {
            $data['slug'] = Slug::uniqueFor($data['name'], Product::class, $product->id);
        }

        if (array_key_exists('description', $data)) {
            $data['description'] = HtmlSanitizer::clean($data['description']);
        }

        $product->update($data);

        return $product->load(['category', 'images', 'primaryImage']);
    }

    /**
     * FR-CAT-6: deleting a product removes its image rows and files.
     */
    public function delete(Product $product): void
    {
        DB::transaction(function () use ($product): void {
            $product->images()->each(function (ProductImage $image): void {
                Storage::disk('public')->delete($image->path);
                $image->delete();
            });

            $product->delete();
        });
    }

    private function publicQuery(): Builder
    {
        return Product::query()
            ->active()
            ->whereHas('category', fn (Builder $query) => $query->where('is_active', true));
    }

    private function applySearch(Builder $query, ?string $search): void
    {
        if ($search === null || $search === '') {
            return;
        }

        $query->where(function (Builder $query) use ($search): void {
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        });
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyPriceRange(Builder $query, array $filters): void
    {
        if (isset($filters['min_price'])) {
            $query->whereRaw(self::PRICE_EXPR.' >= ?', [(int) $filters['min_price']]);
        }

        if (isset($filters['max_price'])) {
            $query->whereRaw(self::PRICE_EXPR.' <= ?', [(int) $filters['max_price']]);
        }
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderByRaw(self::PRICE_EXPR.' asc')->orderBy('id'),
            'price_desc' => $query->orderByRaw(self::PRICE_EXPR.' desc')->orderBy('id'),
            default => $query->latest('id'),
        };
    }
}
