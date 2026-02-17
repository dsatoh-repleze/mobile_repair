<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StocktakingSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'created_by',
        'completed_by',
        'status',
        'notes',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'created_by');
    }

    public function completer(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'completed_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StocktakingItem::class);
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function getProgressAttribute(): array
    {
        $total = $this->items()->count();
        $counted = $this->items()->where('is_counted', true)->count();

        return [
            'total' => $total,
            'counted' => $counted,
            'percentage' => $total > 0 ? round(($counted / $total) * 100) : 0,
        ];
    }

    public function getDiscrepancySummaryAttribute(): array
    {
        $items = $this->items()->where('is_counted', true)->get();

        $totalDifference = $items->sum('difference');
        $positiveCount = $items->where('difference', '>', 0)->count();
        $negativeCount = $items->where('difference', '<', 0)->count();
        $matchCount = $items->where('difference', 0)->count();

        return [
            'total_difference' => $totalDifference,
            'positive_count' => $positiveCount,
            'negative_count' => $negativeCount,
            'match_count' => $matchCount,
        ];
    }
}
