<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicalCase;
use App\Models\OutpatientDetail;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OutpatientDetailController extends Controller
{
    /**
     * GET /api/cases/{id}/outpatient
     */
    public function show(int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $detail = OutpatientDetail::firstOrCreate(['case_id' => $case->id]);

        return response()->json(['data' => $detail]);
    }

    /**
     * PUT /api/cases/{id}/outpatient
     */
    public function update(Request $request, int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $data = $request->validate([
            'file_date' => ['nullable', 'date'],
            'file_number' => ['nullable', 'string', 'max:255'],
            'consult_date' => ['nullable', 'date'],
            'followup_date' => ['nullable', 'date'],
            'ongoing_treatment' => ['nullable', 'boolean'],
            'date_to_admin' => ['nullable', 'date'],
            'mr_requested' => ['nullable', 'boolean'],
            'mr_received' => ['nullable', 'boolean'],
            'admin_closure_date' => ['nullable', 'date'],
            'submission_date' => ['nullable', 'date'],
            'date_pastel' => ['nullable', 'date'],
            'case_status' => ['nullable', 'string', 'max:255'],
        ]);

        $detail = OutpatientDetail::firstOrCreate(['case_id' => $case->id]);
        $before = $detail->toArray();
        $detail->update($data);

        AuditService::log(
            'outpatient.updated',
            $case,
            ['before' => $before, 'after' => $detail->fresh()->toArray()],
            "Outpatient details updated for case {$case->case_number}."
        );

        return response()->json(['data' => $detail]);
    }
}
