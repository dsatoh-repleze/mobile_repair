<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Member;
use App\Models\Plan;
use App\Models\Product;
use App\Models\RedemptionLog;
use App\Models\Staff;
use App\Models\Store;
use App\Models\StoreProductStock;
use App\Models\Ticket;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create Admin
        $admin = Admin::firstOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => '管理者', 'password' => Hash::make('password')]
        );

        // Create Store
        $store = Store::firstOrCreate(
            ['name' => '東京本店'],
            ['address' => '東京都渋谷区xxx', 'phone' => '03-1234-5678', 'prefecture' => '東京都']
        );

        // Create another store
        $store2 = Store::firstOrCreate(
            ['name' => '渋谷店'],
            ['address' => '東京都渋谷区yyy', 'phone' => '03-9876-5432', 'prefecture' => '東京都']
        );

        // Create Staff
        $staff = Staff::firstOrCreate(
            ['email' => 'staff@example.com'],
            ['name' => '店長', 'password' => Hash::make('password'), 'store_id' => $store->id, 'role' => 'manager']
        );

        // Update store manager
        $store->update(['manager_id' => $staff->id]);

        // Create Member
        $member = Member::firstOrCreate(
            ['email' => 'member@example.com'],
            ['name' => 'テスト会員', 'password' => Hash::make('password'), 'phone' => '090-1234-5678', 'status' => 'active']
        );

        // Create Plans
        Plan::firstOrCreate(
            ['name' => 'ベーシックプラン'],
            ['price' => 3000, 'description' => '月4回のチケット付き', 'ticket_count' => 4, 'is_active' => true]
        );

        Plan::firstOrCreate(
            ['name' => 'スタンダードプラン'],
            ['price' => 5000, 'description' => '月8回のチケット付き', 'ticket_count' => 8, 'is_active' => true]
        );

        Plan::firstOrCreate(
            ['name' => 'プレミアムプラン'],
            ['price' => 8000, 'description' => '月12回のチケット付き', 'ticket_count' => 12, 'is_active' => true]
        );

        // Create Tickets for test member
        $ticket1 = Ticket::firstOrCreate(
            ['member_id' => $member->id, 'ticket_type' => 'スタンダード'],
            ['remaining_uses' => 6, 'status' => 'active', 'expires_at' => now()->addMonth()]
        );

        $ticket2 = Ticket::firstOrCreate(
            ['member_id' => $member->id, 'ticket_type' => 'ボーナス'],
            ['remaining_uses' => 2, 'status' => 'active', 'expires_at' => now()->addDays(5)]
        );

        $ticket3 = Ticket::firstOrCreate(
            ['member_id' => $member->id, 'ticket_type' => '先月分'],
            ['remaining_uses' => 0, 'status' => 'used', 'expires_at' => now()->subDays(5)]
        );

        // Create some redemption history (skip if already exists)
        if (RedemptionLog::count() === 0) {
            RedemptionLog::create([
                'ticket_id' => $ticket1->id,
                'member_id' => $member->id,
                'staff_id' => $staff->id,
                'store_id' => $store->id,
                'redeemed_at' => now()->subDays(2)->setHour(14)->setMinute(30),
            ]);

            RedemptionLog::create([
                'ticket_id' => $ticket1->id,
                'member_id' => $member->id,
                'staff_id' => $staff->id,
                'store_id' => $store2->id,
                'redeemed_at' => now()->subDays(5)->setHour(11)->setMinute(0),
            ]);

            RedemptionLog::create([
                'ticket_id' => $ticket3->id,
                'member_id' => $member->id,
                'staff_id' => $staff->id,
                'store_id' => $store->id,
                'redeemed_at' => now()->subDays(10)->setHour(16)->setMinute(45),
            ]);
        }

        // Create Products (スマホアクセサリー)
        $products = [
            ['name' => 'iPhone 15 ケース クリア', 'barcode' => '4901234567001', 'description' => '透明度の高いクリアケース。傷から本体を守ります。', 'category' => 'ケース', 'price' => 1980, 'is_ec_visible' => true, 'stock_quantity' => 100, 'low_stock_threshold' => 10],
            ['name' => 'iPhone 15 Pro 手帳型ケース', 'barcode' => '4901234567002', 'description' => 'カード収納付き手帳型ケース。ビジネスシーンにも最適。', 'category' => 'ケース', 'price' => 2980, 'is_ec_visible' => true, 'stock_quantity' => 50, 'low_stock_threshold' => 5],
            ['name' => 'USB-C 充電ケーブル 1m', 'barcode' => '4901234567003', 'description' => '高耐久USB-C to USB-C充電ケーブル。急速充電対応。', 'category' => '充電器', 'price' => 980, 'is_ec_visible' => true, 'stock_quantity' => 200, 'low_stock_threshold' => 20],
            ['name' => 'USB-C 急速充電器 20W', 'barcode' => '4901234567004', 'description' => 'コンパクトな20W急速充電器。PSE認証取得。', 'category' => '充電器', 'price' => 2480, 'is_ec_visible' => true, 'stock_quantity' => 80, 'low_stock_threshold' => 8],
            ['name' => 'ワイヤレス充電パッド', 'barcode' => '4901234567005', 'description' => 'Qi対応ワイヤレス充電パッド。15W急速充電対応。', 'category' => '充電器', 'price' => 3480, 'is_ec_visible' => true, 'stock_quantity' => 40, 'low_stock_threshold' => 5],
            ['name' => 'ガラスフィルム iPhone 15', 'barcode' => '4901234567006', 'description' => '9H硬度の強化ガラスフィルム。指紋防止加工済み。', 'category' => '保護フィルム', 'price' => 1280, 'is_ec_visible' => true, 'stock_quantity' => 150, 'low_stock_threshold' => 15],
            ['name' => 'AirPods Pro ケース', 'barcode' => '4901234567007', 'description' => 'AirPods Pro用シリコンケース。カラビナ付き。', 'category' => 'ケース', 'price' => 1580, 'is_ec_visible' => true, 'stock_quantity' => 60, 'low_stock_threshold' => 6],
            ['name' => 'スマホスタンド 折りたたみ式', 'barcode' => '4901234567008', 'description' => 'アルミ製折りたたみスタンド。角度調整可能。', 'category' => 'アクセサリー', 'price' => 1480, 'is_ec_visible' => true, 'stock_quantity' => 70, 'low_stock_threshold' => 7],
            ['name' => 'Bluetoothイヤホン', 'barcode' => '4901234567009', 'description' => 'ワイヤレスイヤホン。ノイズキャンセリング搭載。', 'category' => 'オーディオ', 'price' => 4980, 'is_ec_visible' => true, 'stock_quantity' => 30, 'low_stock_threshold' => 3],
            ['name' => 'MagSafe対応カーマウント', 'barcode' => '4901234567010', 'description' => 'MagSafe対応車載ホルダー。ワンタッチ装着。', 'category' => 'アクセサリー', 'price' => 3980, 'is_ec_visible' => true, 'stock_quantity' => 25, 'low_stock_threshold' => 3],
        ];

        foreach ($products as $productData) {
            $stockQuantity = $productData['stock_quantity'];
            $lowStockThreshold = $productData['low_stock_threshold'];
            unset($productData['stock_quantity'], $productData['low_stock_threshold']);

            $product = Product::firstOrCreate(
                ['barcode' => $productData['barcode']],
                $productData
            );

            StoreProductStock::firstOrCreate(
                ['product_id' => $product->id, 'store_id' => $store->id],
                ['stock_quantity' => $stockQuantity, 'low_stock_threshold' => $lowStockThreshold, 'is_active' => true]
            );
        }
    }
}
