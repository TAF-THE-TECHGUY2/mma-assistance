<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    /**
     * Write an entry to the audit_logs table for the currently authenticated user.
     *
     * @param  string                                          $action       Short action key, e.g. "case.created", "case.sent_to_billing".
     * @param  \Illuminate\Database\Eloquent\Model|null         $model        The auditable model (provides auditable_type + auditable_id).
     * @param  array|null                                       $changes      Arbitrary change payload stored as JSON (e.g. ['before' => [...], 'after' => [...]]).
     * @param  string|null                                      $description  Human readable description of what happened.
     */
    public static function log(
        string $action,
        ?Model $model = null,
        ?array $changes = null,
        ?string $description = null
    ): AuditLog {
        return AuditLog::create([
            'user_id'        => Auth::id(),
            'action'         => $action,
            'auditable_type' => $model ? get_class($model) : null,
            'auditable_id'   => $model?->getKey(),
            'changes'        => $changes,
            'description'    => $description,
        ]);
    }
}
