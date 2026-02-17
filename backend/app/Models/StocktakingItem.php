<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StocktakingItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'stocktaking_session_id',
        'product_id',
        'system_quantity',
        'actual_quantity',
        'difference',
        'notes',
        'is_counted',
    ];

    protected $casts = [
        'system_quantity' => 'integer',
        'actual_quantity' => 'integer',
        'difference' => 'integer',
        'is_counted' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(StocktakingSession::class, 'stocktaking_session_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function updateCount(int $actualQuantity, ?string $notes = null): void
    {
        $this->update([
            'actual_quantity' => $actualQuantity,
            'difference' => $actualQuantity - $this->system_quantity,
            'notes' => $notes,
            'is_counted' => true,
        ]);
    }

    public function hasDiscrepancy(): bool
    {
        return $this->is_counted && $this->difference !== 0;
    }
}
