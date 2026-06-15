<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicalCase;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CaseController extends Controller
{
    /**
     * Canonical detail relationship per case type.
     *
     * @var array<string, string>
     */
    private array $detailRelations = [
        'inpatient' => 'inpatientDetail',
        'outpatient' => 'outpatientDetail',
        'laboratory' => 'laboratoryDetail',
    ];

    /**
     * GET /api/cases
     * List cases with optional filters (status, type, stage, priority, search).
     */
    public function index(Request $request): JsonResponse
    {
        $query = MedicalCase::query()->with('patient');

        if ($status = $request->query('case_status')) {
            $query->where('case_status', $status);
        }

        if ($type = $request->query('case_type')) {
            $query->where('case_type', $type);
        }

        if ($stage = $request->query('workflow_stage')) {
            $query->where('workflow_stage', $stage);
        }

        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }

        if ($department = $request->query('assigned_department')) {
            $query->where('assigned_department', $department);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('case_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('surname', 'like', "%{$search}%")
                            ->orWhere('mma_file_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->boolean('overdue')) {
            $query->whereNotNull('due_date')
                ->whereDate('due_date', '<', now()->toDateString())
                ->whereNotIn('case_status', [MedicalCase::STATUS_CLOSED, MedicalCase::STATUS_CANCELLED]);
        }

        if ($dueFrom = $request->query('due_from')) {
            $query->whereDate('due_date', '>=', $dueFrom);
        }

        if ($dueTo = $request->query('due_to')) {
            $query->whereDate('due_date', '<=', $dueTo);
        }

        $sort = $request->query('sort', 'created_at');
        $direction = $request->query('direction', 'desc') === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['case_number', 'case_status', 'workflow_stage', 'priority', 'date_opened', 'due_date', 'created_at'];
        if (in_array($sort, $allowedSorts, true)) {
            $query->orderBy($sort, $direction);
        }

        $perPage = (int) $request->query('per_page', 25);
        $cases = $query->paginate($perPage);

        return response()->json([
            'data' => $cases->items(),
            'meta' => [
                'current_page' => $cases->currentPage(),
                'last_page' => $cases->lastPage(),
                'per_page' => $cases->perPage(),
                'total' => $cases->total(),
            ],
        ]);
    }

    /**
     * GET /api/upcoming-cases
     * Open (non-closed) cases ordered by due date — dated cases first, soonest
     * due at the top — so staff can see what's overdue / due soon and assign a
     * due date to anything still missing one. Drives the Upcoming Cases view.
     */
    public function upcoming(Request $request): JsonResponse
    {
        $query = MedicalCase::query()
            ->with('patient')
            ->whereNotIn('case_status', [MedicalCase::STATUS_CLOSED, MedicalCase::STATUS_CANCELLED]);

        if ($type = $request->query('case_type')) {
            $query->where('case_type', $type);
        }

        $cases = $query
            ->orderByRaw('due_date IS NULL')   // dated cases first, undated last
            ->orderBy('due_date')
            ->get();

        return response()->json(['data' => $cases]);
    }

    /**
     * POST /api/cases
     * Create a new case. Generates a unique case number and a type-specific
     * detail record.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'case_type' => ['required', 'in:inpatient,outpatient,laboratory'],
            'file_number' => ['nullable', 'string', 'max:255'],
            'treating_doctor' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'case_status' => ['nullable', 'in:booked,in_progress,admin_review,billing,closed,cancelled'],
            'workflow_stage' => ['nullable', 'in:operations,admin_review,billing,closed'],
            'priority' => ['nullable', 'in:low,medium,high,urgent'],
            'assigned_department' => ['nullable', 'string', 'max:255'],
            'date_opened' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            // Optional detail-record seed fields captured at booking.
            'admission_date' => ['nullable', 'date'],
            'hospital' => ['nullable', 'string', 'max:255'],
            'consult_date' => ['nullable', 'date'],
            'ongoing_treatment' => ['nullable', 'boolean'],
            'appointment_date' => ['nullable', 'date'],
            'lab_type' => ['nullable', 'string', 'max:255'],
            'treating_doctor' => ['nullable', 'string', 'max:255'],
            'area' => ['nullable', 'string', 'max:255'],
        ]);

        $case = MedicalCase::create([
            'case_number' => $this->generateCaseNumber($data['case_type']),
            'file_number' => $data['file_number'] ?? null,
            'patient_id' => $data['patient_id'],
            'case_type' => $data['case_type'],
            'treating_doctor' => $data['treating_doctor'] ?? null,
            'notes' => $data['notes'] ?? null,
            'case_status' => $data['case_status'] ?? 'booked',
            'workflow_stage' => $data['workflow_stage'] ?? 'operations',
            'priority' => $data['priority'] ?? 'medium',
            'assigned_department' => $data['assigned_department'] ?? null,
            'created_by' => Auth::id(),
            'date_opened' => $data['date_opened'] ?? now()->toDateString(),
            'due_date' => $data['due_date'] ?? null,
        ]);

        // Create the type-specific detail row, seeded with any booking inputs.
        $this->createDetailRecord($case, $data);

        AuditService::log(
            'case.created',
            $case,
            ['after' => $case->toArray()],
            "Case {$case->case_number} created."
        );

        NotificationService::notify(
            'case.created',
            "New {$case->case_type} case {$case->case_number} created.",
            $case,
            null
        );

        $case->load('patient');

        // New laboratory requests go to the lab; other new cases start in
        // Operations. Both also reach the owner (when configured).
        if ($case->case_type === 'laboratory') {
            NotificationService::emailDepartment(
                'laboratory',
                'lab_request_created',
                "New laboratory request {$case->case_number}",
                $this->emailLines($case, 'A new laboratory request has been logged.'),
                $case
            );
        } else {
            NotificationService::emailForStage(
                $case->workflow_stage,
                'case_created',
                "New {$case->case_type} case {$case->case_number}",
                $this->emailLines($case, 'A new case has been created and is awaiting operations.'),
                $case
            );
        }

        return response()->json([
            'data' => $case,
        ], 201);
    }

    /**
     * GET /api/cases/{id}
     * Returns the case with patient and all related detail/billing/review data.
     */
    public function show(int $id): JsonResponse
    {
        $case = MedicalCase::with([
            'patient',
            'inpatientDetail',
            'outpatientDetail',
            'laboratoryDetail',
            'billings',
            'adminReviews',
            'documents',
            'auditLogs' => fn ($query) => $query->with('user')->latest(),
        ])->findOrFail($id);

        return response()->json(['data' => $case]);
    }

    /**
     * PUT /api/cases/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $case = MedicalCase::findOrFail($id);

        $data = $request->validate([
            'case_status' => ['sometimes', 'in:booked,in_progress,admin_review,billing,closed,cancelled'],
            'workflow_stage' => ['sometimes', 'in:operations,admin_review,billing,closed'],
            'priority' => ['sometimes', 'in:low,medium,high,urgent'],
            'assigned_department' => ['nullable', 'string', 'max:255'],
            'file_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'treating_doctor' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'date_opened' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date'],
        ]);

        $before = $case->toArray();
        $case->update($data);

        AuditService::log(
            'case.updated',
            $case,
            ['before' => $before, 'after' => $case->fresh()->toArray()],
            "Case {$case->case_number} updated."
        );

        return response()->json(['data' => $case->load('patient')]);
    }

    /**
     * DELETE /api/cases/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $case = MedicalCase::findOrFail($id);
        $number = $case->case_number;

        $case->delete();

        AuditService::log(
            'case.deleted',
            null,
            ['id' => $id, 'case_number' => $number],
            "Case {$number} deleted."
        );

        return response()->json(['message' => 'Case deleted.']);
    }

    /**
     * POST /api/cases/{id}/send-to-operations
     */
    public function sendToOperations(int $id): JsonResponse
    {
        return $this->transition(
            $id,
            caseStatus: 'in_progress',
            workflowStage: 'operations',
            action: 'case.sent_to_operations',
            messageVerb: 'sent to operations',
            event: 'sent_to_operations'
        );
    }

    /**
     * POST /api/cases/{id}/send-to-admin-review
     */
    public function sendToAdminReview(int $id): JsonResponse
    {
        return $this->transition(
            $id,
            caseStatus: 'admin_review',
            workflowStage: 'admin_review',
            action: 'case.sent_to_admin_review',
            messageVerb: 'sent to admin review',
            event: 'sent_to_admin_review'
        );
    }

    /**
     * POST /api/cases/{id}/send-to-billing
     */
    public function sendToBilling(int $id): JsonResponse
    {
        return $this->transition(
            $id,
            caseStatus: 'billing',
            workflowStage: 'billing',
            action: 'case.sent_to_billing',
            messageVerb: 'sent to billing',
            event: 'sent_to_billing'
        );
    }

    /**
     * POST /api/cases/{id}/close
     */
    public function close(int $id): JsonResponse
    {
        return $this->transition(
            $id,
            caseStatus: 'closed',
            workflowStage: 'closed',
            action: 'case.closed',
            messageVerb: 'closed',
            event: 'case_closed'
        );
    }

    /**
     * POST /api/cases/{id}/cancel
     * Mark a case as cancelled / no-show with a reason. Drops it off the
     * Upcoming list and is tracked separately from closed (completed) cases.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'cancellation_reason' => ['required', 'in:no_show,patient_cancelled,client_cancelled,other'],
        ]);

        $case = MedicalCase::with('patient')->findOrFail($id);
        $before = [
            'case_status' => $case->case_status,
            'workflow_stage' => $case->workflow_stage,
        ];

        $case->update([
            'case_status' => MedicalCase::STATUS_CANCELLED,
            'workflow_stage' => MedicalCase::STAGE_CLOSED,
            'cancellation_reason' => $data['cancellation_reason'],
        ]);

        $label = $this->reasonLabel($data['cancellation_reason']);

        AuditService::log(
            'case.cancelled',
            $case,
            ['before' => $before, 'after' => ['case_status' => 'cancelled', 'reason' => $data['cancellation_reason']]],
            "Case {$case->case_number} cancelled ({$label})."
        );

        NotificationService::notify(
            'case.cancelled',
            "Case {$case->case_number} cancelled — {$label}.",
            $case,
            null,
        );

        return response()->json(['data' => $case->load('patient')]);
    }

    private function reasonLabel(string $reason): string
    {
        return match ($reason) {
            'no_show' => 'no-show',
            'patient_cancelled' => 'patient cancelled',
            'client_cancelled' => 'client cancelled',
            default => 'other',
        };
    }

    /**
     * Shared workflow-stage transition helper. Updates case_status +
     * workflow_stage, writes an audit log, and emits a notification.
     */
    private function transition(
        int $id,
        string $caseStatus,
        string $workflowStage,
        string $action,
        string $messageVerb,
        string $event
    ): JsonResponse {
        $case = MedicalCase::with('patient')->findOrFail($id);

        $before = [
            'case_status' => $case->case_status,
            'workflow_stage' => $case->workflow_stage,
        ];

        $case->update([
            'case_status' => $caseStatus,
            'workflow_stage' => $workflowStage,
        ]);

        $after = [
            'case_status' => $case->case_status,
            'workflow_stage' => $case->workflow_stage,
        ];

        AuditService::log(
            $action,
            $case,
            ['before' => $before, 'after' => $after],
            "Case {$case->case_number} {$messageVerb}."
        );

        NotificationService::notify(
            $action,
            "Case {$case->case_number} {$messageVerb}.",
            $case,
            null
        );

        // When a case enters billing, ensure a (pending) billing record exists
        // so it shows up in the Billing module's "Pending Billing" list.
        if ($workflowStage === 'billing') {
            \App\Models\Billing::firstOrCreate(
                ['case_id' => $case->id],
                ['billing_status' => 'pending'],
            );
        }

        // Email the department that now owns this stage (+ the owner).
        NotificationService::emailForStage(
            $workflowStage,
            $event,
            "Case {$case->case_number} {$messageVerb}",
            $this->emailLines($case, "This case has been {$messageVerb} and is now in your workflow."),
            $case
        );

        return response()->json(['data' => $case->load('patient')]);
    }

    /**
     * Build the human-readable body lines shared by workflow emails.
     *
     * @return array<int,string>
     */
    private function emailLines(MedicalCase $case, string $intro): array
    {
        $patientName = $case->patient
            ? trim($case->patient->first_name . ' ' . $case->patient->surname)
            : 'Unknown patient';

        return [
            $intro,
            "Patient: {$patientName}",
            'Case type: ' . ucfirst($case->case_type),
            'Priority: ' . ucfirst($case->priority),
        ];
    }

    /**
     * Generate a unique, human-readable case number.
     */
    private function generateCaseNumber(string $type): string
    {
        $prefix = match ($type) {
            'inpatient' => 'IP',
            'outpatient' => 'OP',
            'laboratory' => 'LAB',
            default => 'CASE',
        };

        do {
            $candidate = sprintf(
                '%s-%s-%s',
                $prefix,
                now()->format('Ym'),
                strtoupper(Str::random(6))
            );
        } while (MedicalCase::where('case_number', $candidate)->exists());

        return $candidate;
    }

    /**
     * Create the type-specific detail record for a freshly created case,
     * seeded with any initial fields captured at booking (admission/consult/
     * appointment date, etc.). This runs as part of case creation so Booking
     * can set them without needing the operations-only detail endpoints.
     *
     * @param  array<string, mixed>  $seed
     */
    private function createDetailRecord(MedicalCase $case, array $seed = []): void
    {
        switch ($case->case_type) {
            case 'inpatient':
                \App\Models\InpatientDetail::create([
                    'case_id' => $case->id,
                    'hospital' => $seed['hospital'] ?? null,
                    'admission_date' => $seed['admission_date'] ?? null,
                ]);
                break;
            case 'outpatient':
                \App\Models\OutpatientDetail::create([
                    'case_id' => $case->id,
                    'consult_date' => $seed['consult_date'] ?? null,
                    'ongoing_treatment' => $seed['ongoing_treatment'] ?? false,
                ]);
                break;
            case 'laboratory':
                \App\Models\LaboratoryDetail::create([
                    'case_id' => $case->id,
                    'appointment_date' => $seed['appointment_date'] ?? null,
                    'lab_type' => $seed['lab_type'] ?? null,
                    'treating_doctor' => $seed['treating_doctor'] ?? null,
                    'area' => $seed['area'] ?? null,
                ]);
                break;
        }
    }
}
