<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderNumberSequence extends Model
{
    protected $fillable = [
        'year',
        'sequence',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'sequence' => 'integer',
        ];
    }
}
