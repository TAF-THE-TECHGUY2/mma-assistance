<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InpatientDetail;
use App\Models\MedicalCase;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InpatientDetailController extends Controller
{
    /**
     * GET /api/cases/{id}/inpatient
     */
    public function show(int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $detail = InpatientDetail::firstOrCreate(['case_id' => $case->id]);

        return response()->json(['data' => $detail]);
    }

    /**
     * PUT /api/cases/{id}/inpatient
     */
    public function update(Request $request, int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $data = $request->validate([
            'file_number' => ['nullable', 'string', 'max:255'],
            'hospital' => ['nullable', 'string', 'max:255'],
            'admission_date' => ['nullable', 'date'],
            'discharge_date' => ['nullable', 'date'],
            'date_to_admin' => ['nullable', 'date'],
            'mr_requested' => ['nullable', 'boolean'],
            'mr_received' => ['nullable', 'boolean'],
            'admin_closure_date' => ['nullable', 'date'],
            'submission_date' => ['nullable', 'date'],
            'date_pastel' => ['nullable', 'date'],
            'case_status' => ['nullable', 'string', 'max:255'],
        ]);

        $detail = InpatientDetail::firstOrCreate(['case_id' => $case->id]);
        $before = $detail->toArray();
        $detail->update($data);

        AuditService::log(
            'inpatient.updated',
            $case,
            ['before' => $before, 'after' => $detail->fresh()->toArray()],
            "Inpatient details updated for case {$case->case_number}."
        );

        return response()->json(['data' => $detail]);
    }
}
