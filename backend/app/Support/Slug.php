<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

final class Slug
{
    /**
     * Build a URL slug from a name and add a numeric suffix until it is unique
     * across soft-deleted rows too (the unique index covers them).
     *
     * @param  class-string<Model>  $model
     */
    public static function uniqueFor(string $source, string $model, ?int $ignoreId = null): string
    {
        $base = Str::slug($source) ?: 'item';
        $candidate = $base;
        $suffix = 2;

        while ($model::withTrashed()
            ->where('slug', $candidate)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()
        ) {
            $candidate = $base.'-'.$suffix++;
        }

        return $candidate;
    }
}
