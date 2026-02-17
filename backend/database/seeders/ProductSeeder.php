<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'iPhone 15 クリアケース',
                'description' => '透明度の高いTPU素材のiPhone 15用ケース',
                'category' => 'ケース',
                'barcode' => '4901234567001',
                'price' => 1980,
                'stock_quantity' => 50,
                'low_stock_threshold' => 10,
                'is_active' => true,
            ],
            [
                'name' => 'Galaxy S24 手帳型ケース',
                'description' => 'カード収納付きの手帳型ケース',
                'category' => 'ケース',
                'barcode' => '4901234567002',
                'price' => 2980,
                'stock_quantity' => 30,
                'low_stock_threshold' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'USB-C 急速充電器 20W',
                'description' => 'PD対応のコンパクト急速充電器',
                'category' => '充電器',
                'barcode' => '4901234567003',
                'price' => 2480,
                'stock_quantity' => 40,
                'low_stock_threshold' => 8,
                'is_active' => true,
            ],
            [
                'name' => 'ワイヤレス充電パッド 15W',
                'description' => 'Qi対応ワイヤレス充電器',
                'category' => '充電器',
                'barcode' => '4901234567004',
                'price' => 3480,
                'stock_quantity' => 25,
                'low_stock_threshold' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'iPhone 15 Pro ガラスフィルム',
                'description' => '9H硬度の強化ガラス保護フィルム',
                'category' => '保護フィルム',
                'barcode' => '4901234567005',
                'price' => 1480,
                'stock_quantity' => 100,
                'low_stock_threshold' => 20,
                'is_active' => true,
            ],
            [
                'name' => 'Galaxy S24 Ultra フィルム',
                'description' => '指紋認証対応の保護フィルム',
                'category' => '保護フィルム',
                'barcode' => '4901234567006',
                'price' => 1680,
                'stock_quantity' => 80,
                'low_stock_threshold' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'Lightning ケーブル 1m',
                'description' => 'MFi認証Lightningケーブル',
                'category' => 'ケーブル',
                'barcode' => '4901234567007',
                'price' => 1280,
                'stock_quantity' => 60,
                'low_stock_threshold' => 10,
                'is_active' => true,
            ],
            [
                'name' => 'USB-C to USB-C ケーブル 2m',
                'description' => '100W対応の高速充電ケーブル',
                'category' => 'ケーブル',
                'barcode' => '4901234567008',
                'price' => 1580,
                'stock_quantity' => 45,
                'low_stock_threshold' => 10,
                'is_active' => true,
            ],
            [
                'name' => 'モバイルバッテリー 10000mAh',
                'description' => 'PD対応の大容量モバイルバッテリー',
                'category' => 'バッテリー',
                'barcode' => '4901234567009',
                'price' => 4980,
                'stock_quantity' => 20,
                'low_stock_threshold' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'スマホスタンド 折りたたみ式',
                'description' => 'アルミ製の角度調節可能スタンド',
                'category' => 'アクセサリー',
                'barcode' => '4901234567010',
                'price' => 1980,
                'stock_quantity' => 35,
                'low_stock_threshold' => 8,
                'is_active' => true,
            ],
        ];

        foreach ($products as $productData) {
            Product::firstOrCreate(
                ['barcode' => $productData['barcode']],
                $productData
            );
        }
    }
}
