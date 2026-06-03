<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /api/audit-logs
     * List audit-log entries with optional filters, most recent first.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('user');

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        if ($type = $request->query('auditable_type')) {
            $query->where('auditable_type', $type);
        }

        if ($auditableId = $request->query('auditable_id')) {
            $query->where('auditable_id', $auditableId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $query->orderByDesc('created_at');

        $perPage = (int) $request->query('per_page', 50);
        $logs = $query->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
