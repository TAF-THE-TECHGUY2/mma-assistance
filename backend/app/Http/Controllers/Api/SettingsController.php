<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * GET /api/settings
     * Returns the notification settings (recipient emails + per-event toggles),
     * with defaults merged in for any missing keys.
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => NotificationService::settings(),
        ]);
    }

    /**
     * PUT /api/settings
     * Update the notification recipient emails and event toggles.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'owner_email' => ['nullable', 'email'],
            'owner_receives_all' => ['sometimes', 'boolean'],
            'department_emails' => ['sometimes', 'array'],
            'department_emails.operations' => ['nullable', 'email'],
            'department_emails.admin' => ['nullable', 'email'],
            'department_emails.billing' => ['nullable', 'email'],
            'department_emails.laboratory' => ['nullable', 'email'],
            'events' => ['sometimes', 'array'],
            'events.*' => ['boolean'],
        ]);

        // Merge the incoming changes over the current (defaults-backed) settings.
        $merged = array_replace_recursive(NotificationService::settings(), $data);

        Setting::set('notifications', $merged);

        AuditService::log(
            'settings.notifications.updated',
            null,
            ['after' => $merged],
            'Notification recipient settings updated.'
        );

        return response()->json(['data' => $merged]);
    }
}
