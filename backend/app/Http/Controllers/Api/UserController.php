<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Canonical roles.
     */
    private const ROLES = ['booking', 'operations', 'billing', 'admin', 'owner'];

    /**
     * GET /api/users
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $query->orderBy('name');

        $perPage = (int) $request->query('per_page', 50);
        $users = $query->paginate($perPage);

        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * POST /api/users
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(self::ROLES)],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
        ]);

        AuditService::log(
            'user.created',
            $user,
            ['after' => $user->toArray()],
            "User {$user->name} ({$user->role}) created."
        );

        return response()->json(['data' => $user], 201);
    }

    /**
     * GET /api/users/{id}
     */
    public function show(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        return response()->json(['data' => $user]);
    }

    /**
     * PUT /api/users/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in(self::ROLES)],
        ]);

        $before = $user->toArray();

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }
        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
        }
        if (array_key_exists('role', $data)) {
            $user->role = $data['role'];
        }
        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        AuditService::log(
            'user.updated',
            $user,
            ['before' => $before, 'after' => $user->fresh()->toArray()],
            "User {$user->name} updated."
        );

        return response()->json(['data' => $user]);
    }

    /**
     * DELETE /api/users/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $label = "{$user->name} ({$user->email})";

        $user->delete();

        AuditService::log(
            'user.deleted',
            null,
            ['id' => $id, 'user' => $label],
            "User {$label} deleted."
        );

        return response()->json(['message' => 'User deleted.']);
    }
}
