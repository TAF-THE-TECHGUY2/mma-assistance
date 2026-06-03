<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\MedicalCase;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    /**
     * GET /api/billing
     * Returns billing records grouped into pending, submitted and history (completed).
     */
    public function index(Request $request): JsonResponse
    {
        $billings = Billing::with('case.patient')
            ->orderByDesc('created_at')
            ->get();

        $pending = $billings->where('billing_status', 'pending')->values();
        $submitted = $billings->where('billing_status', 'submitted')->values();
        $history = $billings->where('billing_status', 'completed')->values();

        return response()->json([
            'data' => [
                'pending' => $pending,
                'submitted' => $submitted,
                'history' => $history,
            ],
            'meta' => [
                'pending' => $pending->count(),
                'submitted' => $submitted->count(),
                'history' => $history->count(),
                'total' => $billings->count(),
            ],
        ]);
    }

    /**
     * PUT /api/billing/{caseId}
     * Update (or create) the billing record for a case.
     */
    public function update(Request $request, int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $data = $request->validate([
            'billing_status' => ['nullable', 'in:pending,submitted,completed'],
            'submission_date' => ['nullable', 'date'],
            'date_pastel' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $billing = Billing::firstOrNew(['case_id' => $case->id]);
        $before = $billing->exists ? $billing->toArray() : null;

        $billing->fill(array_merge(
            ['case_id' => $case->id],
            $data
        ));

        if (! $billing->billing_status) {
            $billing->billing_status = 'pending';
        }

        $billing->save();

        AuditService::log(
            'billing.updated',
            $case,
            ['before' => $before, 'after' => $billing->fresh()->toArray()],
            "Billing updated for case {$case->case_number} (status: {$billing->billing_status})."
        );

        if (($data['billing_status'] ?? null) === 'completed') {
            NotificationService::notify(
                'billing.completed',
                "Billing completed for case {$case->case_number}.",
                $case,
                null
            );
        } elseif (($data['billing_status'] ?? null) === 'submitted') {
            NotificationService::notify(
                'billing.submitted',
                "Billing submitted for case {$case->case_number}.",
                $case,
                null
            );
        }

        return response()->json(['data' => $billing->load('case.patient')]);
    }
}
