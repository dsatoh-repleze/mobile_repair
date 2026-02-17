<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    /**
     * スタッフ一覧を取得
     */
    public function index(Request $request): JsonResponse
    {
        $query = Staff::with('store');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $staffs = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($staffs);
    }

    /**
     * スタッフを作成
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:staffs,email',
            'password' => 'required|string|min:6',
            'store_id' => 'required|exists:stores,id',
            'role' => ['required', Rule::in(['admin', 'manager', 'staff'])],
        ]);

        $staff = Staff::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'store_id' => $validated['store_id'],
            'role' => $validated['role'],
        ]);

        $staff->load('store');

        return response()->json([
            'message' => 'スタッフを作成しました',
            'staff' => $staff,
        ], 201);
    }

    /**
     * スタッフ詳細を取得
     */
    public function show(int $id): JsonResponse
    {
        $staff = Staff::with('store')->findOrFail($id);

        return response()->json(['staff' => $staff]);
    }

    /**
     * スタッフを更新
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $staff = Staff::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                Rule::unique('staffs', 'email')->ignore($staff->id),
            ],
            'password' => 'nullable|string|min:6',
            'store_id' => 'required|exists:stores,id',
            'role' => ['required', Rule::in(['admin', 'manager', 'staff'])],
        ]);

        $staff->name = $validated['name'];
        $staff->email = $validated['email'];
        $staff->store_id = $validated['store_id'];
        $staff->role = $validated['role'];

        if (!empty($validated['password'])) {
            $staff->password = Hash::make($validated['password']);
        }

        $staff->save();
        $staff->load('store');

        return response()->json([
            'message' => 'スタッフを更新しました',
            'staff' => $staff,
        ]);
    }

    /**
     * スタッフを削除
     */
    public function destroy(int $id): JsonResponse
    {
        $staff = Staff::findOrFail($id);
        $staff->delete();

        return response()->json([
            'message' => 'スタッフを削除しました',
        ]);
    }

    /**
     * 店舗一覧を取得（選択用）
     */
    public function stores(): JsonResponse
    {
        $stores = Store::orderBy('name')->get(['id', 'name']);

        return response()->json(['stores' => $stores]);
    }

    /**
     * 権限一覧を取得
     */
    public function roles(): JsonResponse
    {
        return response()->json([
            'roles' => Staff::ROLES,
        ]);
    }
}
