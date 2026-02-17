<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class MemberAuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:members,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
        ]);

        $member = Member::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
        ]);

        $token = Auth::guard('member')->login($member);

        return response()->json([
            'message' => '会員登録が完了しました。',
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
            'user' => $member,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! $token = Auth::guard('member')->attempt($credentials)) {
            return response()->json([
                'message' => '認証に失敗しました。メールアドレスまたはパスワードが正しくありません。',
            ], 401);
        }

        $user = Auth::guard('member')->user();

        if ($user->status === 'suspended') {
            Auth::guard('member')->logout();

            return response()->json([
                'message' => 'このアカウントは停止されています。',
            ], 403);
        }

        return $this->respondWithToken($token);
    }

    public function me(): JsonResponse
    {
        return response()->json(Auth::guard('member')->user());
    }

    public function logout(): JsonResponse
    {
        Auth::guard('member')->logout();

        return response()->json(['message' => 'ログアウトしました。']);
    }

    public function refresh(): JsonResponse
    {
        return $this->respondWithToken(Auth::guard('member')->refresh());
    }

    protected function respondWithToken(string $token): JsonResponse
    {
        $user = Auth::guard('member')->user();

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
            'user' => $user,
        ]);
    }
}
