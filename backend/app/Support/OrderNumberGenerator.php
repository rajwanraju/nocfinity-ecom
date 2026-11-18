<?php

namespace App\Support;

use App\Models\OrderNumberSequence;
use Illuminate\Support\Facades\DB;

/**
 * FR-ORDER-9: ORD-{YYYY}-{6-digit sequence}, allocated under a row lock so
 * concurrent checkouts cannot receive the same number.
 */
class OrderNumberGenerator
{
    public function next(): string
    {
        $year = (int) now()->format('Y');

        DB::table('order_number_sequences')->insertOrIgnore([
            'year' => $year,
            'sequence' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = OrderNumberSequence::query()
            ->where('year', $year)
            ->lockForUpdate()
            ->firstOrFail();

        $row->sequence++;
        $row->save();

        return sprintf('ORD-%d-%06d', $year, $row->sequence);
    }
}
