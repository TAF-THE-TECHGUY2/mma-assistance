<?php

namespace App\Services;

use App\Mail\WorkflowNotificationMail;
use App\Models\MedicalCase;
use App\Models\Notification;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /**
     * Maps a workflow stage to the department settings key responsible for it.
     * A case entering this stage emails that department (plus the owner).
     *
     * @var array<string, string|null>
     */
    public const STAGE_DEPARTMENT = [
        'operations'   => 'operations',
        'admin_review' => 'admin',
        'billing'      => 'billing',
        'closed'       => null,
    ];

    /**
     * Default notification settings, merged under whatever is stored so the
     * Settings page and email dispatch always see a complete shape.
     *
     * @return array<string, mixed>
     */
    public static function defaultSettings(): array
    {
        return [
            'owner_email' => '',
            'owner_receives_all' => true,
            'department_emails' => [
                'operations'  => '',
                'admin'       => '',
                'billing'     => '',
                'laboratory'  => '',
            ],
            'events' => [
                'case_created'         => true,
                'lab_request_created'  => true,
                'sent_to_operations'   => true,
                'sent_to_admin_review' => true,
                'sent_to_billing'      => true,
                'case_closed'          => true,
                'document_uploaded'    => false,
            ],
        ];
    }

    /**
     * Current notification settings (stored values merged over defaults).
     *
     * @return array<string, mixed>
     */
    public static function settings(): array
    {
        $stored = Setting::get('notifications', []);

        if (! is_array($stored)) {
            $stored = [];
        }

        return array_replace_recursive(self::defaultSettings(), $stored);
    }

    /**
     * Create an in-app notification.
     *
     * @param  string                              $type     Notification type key, e.g. "case.sent_to_billing".
     * @param  string                              $message  Human readable message shown to the user.
     * @param  \App\Models\MedicalCase|int|null     $case     Related case (model or id), nullable.
     * @param  \App\Models\User|int|null            $user     Target user (model or id), nullable for broadcast/system notices.
     */
    public static function notify(
        string $type,
        string $message,
        MedicalCase|int|null $case = null,
        User|int|null $user = null
    ): Notification {
        $caseId = $case instanceof MedicalCase ? $case->getKey() : $case;
        $userId = $user instanceof User ? $user->getKey() : $user;

        return Notification::create([
            'type'    => $type,
            'message' => $message,
            'case_id' => $caseId,
            'user_id' => $userId,
            'read'    => false,
        ]);
    }

    /**
     * Email the department responsible for $departmentKey and, when enabled,
     * the owner — but only if the $event toggle is switched on in settings.
     *
     * @param  string|null        $departmentKey  e.g. 'operations', 'admin', 'billing', 'laboratory'.
     * @param  string             $event          Event key matching the settings 'events' map.
     * @param  string             $subject        Email subject.
     * @param  array<int,string>  $lines          Body lines.
     */
    public static function emailDepartment(
        ?string $departmentKey,
        string $event,
        string $subject,
        array $lines,
        ?MedicalCase $case = null
    ): void {
        $cfg = self::settings();

        // Respect the per-event on/off switch (default on if unknown).
        if (array_key_exists($event, $cfg['events']) && ! $cfg['events'][$event]) {
            return;
        }

        $recipients = [];

        if ($departmentKey && ! empty($cfg['department_emails'][$departmentKey])) {
            $recipients[] = $cfg['department_emails'][$departmentKey];
        }

        if (($cfg['owner_receives_all'] ?? true) && ! empty($cfg['owner_email'])) {
            $recipients[] = $cfg['owner_email'];
        }

        $recipients = array_values(array_unique(array_filter($recipients)));

        foreach ($recipients as $index => $to) {
            try {
                // Queue each email (WorkflowNotificationMail is ShouldQueue) with
                // a small per-recipient delay so multi-recipient events stay under
                // provider per-second limits. Queued jobs also retry with backoff
                // if a send is rate-limited, so nothing is silently lost.
                Mail::to($to)->later(
                    now()->addSeconds(2 + ($index * 8)),
                    new WorkflowNotificationMail($subject, $lines, $case),
                );
            } catch (\Throwable $e) {
                // Never let a mail failure break the workflow action.
                Log::error("MMA notification email to {$to} failed to queue: " . $e->getMessage());
            }
        }
    }

    /**
     * Convenience wrapper that resolves the department from a workflow stage.
     */
    public static function emailForStage(
        string $stage,
        string $event,
        string $subject,
        array $lines,
        ?MedicalCase $case = null
    ): void {
        $department = self::STAGE_DEPARTMENT[$stage] ?? null;

        self::emailDepartment($department, $event, $subject, $lines, $case);
    }
}
