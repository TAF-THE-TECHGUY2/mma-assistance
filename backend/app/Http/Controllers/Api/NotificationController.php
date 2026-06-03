<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * List notifications for the authenticated user (and broadcast notices),
     * most recent first.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $query = Notification::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                    ->orWhereNull('user_id');
            });

        if ($request->boolean('unread')) {
            $query->where('read', false);
        }

        $query->orderByDesc('created_at');

        $perPage = (int) $request->query('per_page', 50);
        $notifications = $query->paginate($perPage);

        $unreadCount = Notification::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhereNull('user_id');
        })->where('read', false)->count();

        return response()->json([
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'unread' => $unreadCount,
            ],
        ]);
    }

    /**
     * PUT /api/notifications/{id}/read
     * Mark a single notification as read.
     */
    public function markRead(int $id): JsonResponse
    {
        $notification = Notification::findOrFail($id);
        $notification->update(['read' => true]);

        return response()->json(['data' => $notification]);
    }

    /**
     * PUT /api/notifications/read-all
     * Mark all of the authenticated user's notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $userId = Auth::id();

        Notification::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhereNull('user_id');
        })->where('read', false)->update(['read' => true]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
