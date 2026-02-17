<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'ticket_type',
        'remaining_uses',
        'status',
        'expires_at',
        'last_redeemed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_redeemed_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function redemptionLogs(): HasMany
    {
        return $this->hasMany(RedemptionLog::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where('remaining_uses', '>', 0)
            ->where('expires_at', '>', now());
    }

    public function scopeForMember($query, int $memberId)
    {
        return $query->where('member_id', $memberId);
    }

    public function isRedeemable(): bool
    {
        return $this->status === 'active'
            && $this->remaining_uses > 0
            && $this->expires_at->isFuture();
    }

    public function isInCooldown(): bool
    {
        if (!$this->last_redeemed_at) {
            return false;
        }

        return $this->last_redeemed_at->diffInMinutes(now()) < 5;
    }

    public function getCooldownRemainingSeconds(): int
    {
        if (!$this->last_redeemed_at) {
            return 0;
        }

        $cooldownEnd = $this->last_redeemed_at->addMinutes(5);
        if (now()->gte($cooldownEnd)) {
            return 0;
        }

        return now()->diffInSeconds($cooldownEnd);
    }
}
