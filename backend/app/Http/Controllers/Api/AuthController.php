<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/login
     * Authenticate a user and issue a Sanctum personal access token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = \App\Models\User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Issue a fresh token for this session.
        $token = $user->createToken('mma-token')->plainTextToken;

        AuditService::log(
            'auth.login',
            $user,
            null,
            "User {$user->name} logged in."
        );

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    /**
     * POST /api/logout
     * Revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $accessToken = $user->currentAccessToken();
            if ($accessToken) {
                $accessToken->delete();
            }

            AuditService::log(
                'auth.logout',
                $user,
                null,
                "User {$user->name} logged out."
            );
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * GET /api/me
     * Return the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user(),
        ]);
    }

    /**
     * PUT /api/me
     * Update the authenticated user's profile and preferences.
     */
    public function updateMe(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'preferences' => ['sometimes', 'nullable', 'array'],
            'preferences.emailNotifications' => ['sometimes', 'boolean'],
            'preferences.desktopNotifications' => ['sometimes', 'boolean'],
            'preferences.compactTables' => ['sometimes', 'boolean'],
        ]);

        $before = [
            'name' => $user->name,
            'email' => $user->email,
            'preferences' => $user->preferences,
        ];

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }

        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
        }

        if (array_key_exists('preferences', $data)) {
            $user->preferences = $data['preferences'];
        }

        $user->save();

        AuditService::log(
            'auth.me.updated',
            $user,
            [
                'before' => $before,
                'after' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'preferences' => $user->preferences,
                ],
            ],
            "User {$user->name} updated their profile."
        );

        return response()->json([
            'data' => $user->fresh(),
        ]);
    }
}
