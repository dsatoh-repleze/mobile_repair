<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StaffAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! $token = Auth::guard('staff')->attempt($credentials)) {
            return response()->json([
                'message' => '認証に失敗しました。メールアドレスまたはパスワードが正しくありません。',
            ], 401);
        }

        return $this->respondWithToken($token);
    }

    public function me(): JsonResponse
    {
        $user = Auth::guard('staff')->user();
        $user->load('store');

        return response()->json($user);
    }

    public function logout(): JsonResponse
    {
        Auth::guard('staff')->logout();

        return response()->json(['message' => 'ログアウトしました。']);
    }

    public function refresh(): JsonResponse
    {
        return $this->respondWithToken(Auth::guard('staff')->refresh());
    }

    protected function respondWithToken(string $token): JsonResponse
    {
        $user = Auth::guard('staff')->user();
        $user->load('store');

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
            'user' => $user,
        ]);
    }
}
