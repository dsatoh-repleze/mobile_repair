<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class MemberController extends Controller
{
    /**
     * 会員一覧を取得
     */
    public function index(Request $request): JsonResponse
    {
        $query = Member::withCount(['tickets', 'subscriptions']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $members = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($members);
    }

    /**
     * 会員詳細を取得
     */
    public function show(int $id): JsonResponse
    {
        $member = Member::withCount(['tickets', 'subscriptions'])
            ->with(['subscriptions' => function ($q) {
                $q->where('status', 'active')->with('plan');
            }])
            ->findOrFail($id);

        return response()->json(['member' => $member]);
    }

    /**
     * 会員を更新
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $member = Member::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                Rule::unique('members', 'email')->ignore($member->id),
            ],
            'phone' => 'nullable|string|max:20',
            'status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
            'password' => 'nullable|string|min:6',
        ]);

        $member->name = $validated['name'];
        $member->email = $validated['email'];
        $member->phone = $validated['phone'] ?? null;
        $member->status = $validated['status'];

        if (!empty($validated['password'])) {
            $member->password = Hash::make($validated['password']);
        }

        $member->save();

        return response()->json([
            'message' => '会員情報を更新しました',
            'member' => $member,
        ]);
    }

    /**
     * 会員を削除
     */
    public function destroy(int $id): JsonResponse
    {
        $member = Member::findOrFail($id);
        $member->delete();

        return response()->json([
            'message' => '会員を削除しました',
        ]);
    }

    /**
     * ステータス一覧を取得
     */
    public function statuses(): JsonResponse
    {
        return response()->json([
            'statuses' => [
                ['value' => 'active', 'label' => '有効'],
                ['value' => 'inactive', 'label' => '無効'],
                ['value' => 'suspended', 'label' => '停止'],
            ],
        ]);
    }
}
