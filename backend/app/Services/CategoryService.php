<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Support\Slug;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CategoryService
{
    /**
     * FR-CAT-1: one query builds the whole tree; children are attached as an
     * already-loaded relation so the resource never lazy-loads.
     *
     * @return Collection<int, Category>
     */
    public function tree(bool $activeOnly = false): Collection
    {
        $categories = Category::query()
            ->when($activeOnly, fn ($query) => $query->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $byParent = $categories->groupBy(fn (Category $category): int => $category->parent_id ?? 0);

        $categories->each(function (Category $category) use ($byParent): void {
            $category->setRelation('children', $byParent->get($category->id, collect())->values());
        });

        return $categories
            ->filter(fn (Category $category): bool => $category->parent_id === null)
            ->values();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Category
    {
        $data['slug'] = $data['slug'] ?? Slug::uniqueFor($data['name'], Category::class);
        $data['is_active'] ??= true;
        $data['sort_order'] ??= 0;

        $category = Category::query()->create($data);

        return $category->load('children');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Category $category, array $data): Category
    {
        if (array_key_exists('parent_id', $data) && $data['parent_id'] !== null) {
            $forbidden = $this->descendantIds($category);

            if (in_array((int) $data['parent_id'], $forbidden, true)) {
                throw ValidationException::withMessages([
                    'parent_id' => ['A category cannot be its own parent or a child of one of its descendants.'],
                ]);
            }
        }

        if (! isset($data['slug']) && isset($data['name']) && $data['name'] !== $category->name) {
            $data['slug'] = Slug::uniqueFor($data['name'], Category::class, $category->id);
        }

        $category->update($data);

        return $category->load('children');
    }

    /**
     * FR-CAT-1: deletion is blocked while children or products (including
     * soft-deleted ones) still reference the category.
     */
    public function delete(Category $category): void
    {
        $hasChildren = Category::withTrashed()->where('parent_id', $category->id)->exists();
        $hasProducts = Product::withTrashed()->where('category_id', $category->id)->exists();

        if ($hasChildren || $hasProducts) {
            throw new ConflictHttpException('This category still has children or products and cannot be deleted.');
        }

        $category->delete();
    }

    /**
     * @return list<int>
     */
    public function descendantIds(Category $category): array
    {
        $byParent = Category::query()
            ->get(['id', 'parent_id'])
            ->groupBy(fn (Category $item): int => $item->parent_id ?? 0);

        $ids = [];
        $queue = [$category->id];

        while ($queue !== []) {
            $id = array_shift($queue);
            $ids[] = $id;

            foreach ($byParent->get($id, collect()) as $child) {
                $queue[] = $child->id;
            }
        }

        return $ids;
    }
}
