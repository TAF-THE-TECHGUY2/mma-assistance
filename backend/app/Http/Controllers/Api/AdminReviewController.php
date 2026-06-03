<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminReview;
use App\Models\MedicalCase;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminReviewController extends Controller
{
    /**
     * GET /api/admin-review
     * List cases currently awaiting admin review, plus prior review records.
     */
    public function index(Request $request): JsonResponse
    {
        $cases = MedicalCase::with(['patient', 'adminReviews'])
            ->where('workflow_stage', 'admin_review')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $cases,
            'meta' => ['total' => $cases->count()],
        ]);
    }

    /**
     * POST /api/admin-review/{caseId}
     * Perform an admin action against a case: approve | return | close.
     *
     * - approve: move case forward to billing.
     * - return:  send case back to operations.
     * - close:   close the case.
     */
    public function action(Request $request, int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $data = $request->validate([
            'action' => ['required', 'in:approve,return,close'],
            'review_notes' => ['nullable', 'string'],
            'admin_closure_date' => ['nullable', 'date'],
        ]);

        $action = $data['action'];

        $before = [
            'case_status' => $case->case_status,
            'workflow_stage' => $case->workflow_stage,
        ];

        [$caseStatus, $workflowStage, $auditAction, $verb] = match ($action) {
            'approve' => ['billing', 'billing', 'admin_review.approved', 'approved and sent to billing'],
            'return' => ['in_progress', 'operations', 'admin_review.returned', 'returned to operations'],
            'close' => ['closed', 'closed', 'admin_review.closed', 'closed'],
        };

        $case->update([
            'case_status' => $caseStatus,
            'workflow_stage' => $workflowStage,
        ]);

        // Record the review.
        $review = AdminReview::create([
            'case_id' => $case->id,
            'admin_closure_date' => $data['admin_closure_date']
                ?? ($action === 'close' ? now()->toDateString() : null),
            'review_notes' => $data['review_notes'] ?? null,
            'reviewed_by' => Auth::id(),
        ]);

        AuditService::log(
            $auditAction,
            $case,
            [
                'before' => $before,
                'after' => [
                    'case_status' => $case->case_status,
                    'workflow_stage' => $case->workflow_stage,
                ],
                'review_id' => $review->id,
            ],
            "Case {$case->case_number} {$verb}."
        );

        NotificationService::notify(
            $auditAction,
            "Case {$case->case_number} {$verb}.",
            $case,
            null
        );

        return response()->json([
            'data' => [
                'case' => $case->load('patient'),
                'review' => $review,
            ],
        ]);
    }
}
