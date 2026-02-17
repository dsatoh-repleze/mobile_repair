<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'phone',
        'prefecture',
        'manager_id',
    ];

    public function staffs(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    public function productStocks(): HasMany
    {
        return $this->hasMany(StoreProductStock::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'store_product_stocks')
            ->withPivot(['stock_quantity', 'low_stock_threshold'])
            ->withTimestamps();
    }
}
