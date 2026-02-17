<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'barcode',
        'description',
        'category',
        'price',
        'image_url',
        'is_ec_visible',
    ];

    protected $casts = [
        'price' => 'integer',
        'is_ec_visible' => 'boolean',
    ];

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function storeStocks(): HasMany
    {
        return $this->hasMany(StoreProductStock::class);
    }

    /**
     * Scope to get products active for a specific store
     */
    public function scopeActiveForStore($query, int $storeId)
    {
        return $query->whereHas('storeStocks', function ($q) use ($storeId) {
            $q->where('store_id', $storeId)->where('is_active', true);
        });
    }

    public function scopeEcVisible($query)
    {
        return $query->where('is_ec_visible', true);
    }

    /**
     * Get stock for a specific store
     */
    public function getStockForStore(int $storeId): ?StoreProductStock
    {
        return $this->storeStocks()->where('store_id', $storeId)->first();
    }

    /**
     * Check if product is active for a specific store
     */
    public function isActiveForStore(int $storeId): bool
    {
        $stock = $this->getStockForStore($storeId);
        return $stock ? $stock->is_active : false;
    }

    /**
     * Get stock quantity for a specific store
     */
    public function getStockQuantityForStore(int $storeId): int
    {
        $stock = $this->getStockForStore($storeId);
        return $stock ? $stock->stock_quantity : 0;
    }

    /**
     * Check if product is low stock for a specific store
     */
    public function isLowStockForStore(int $storeId): bool
    {
        $stock = $this->getStockForStore($storeId);
        return $stock ? $stock->isLowStock() : true;
    }
}
