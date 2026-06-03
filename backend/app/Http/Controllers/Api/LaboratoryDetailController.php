<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaboratoryDetail;
use App\Models\MedicalCase;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaboratoryDetailController extends Controller
{
    /**
     * GET /api/cases/{id}/laboratory
     */
    public function show(int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $detail = LaboratoryDetail::firstOrCreate(['case_id' => $case->id]);

        return response()->json(['data' => $detail]);
    }

    /**
     * PUT /api/cases/{id}/laboratory
     */
    public function update(Request $request, int $caseId): JsonResponse
    {
        $case = MedicalCase::findOrFail($caseId);

        $data = $request->validate([
            'appointment_date' => ['nullable', 'date'],
            'treating_doctor' => ['nullable', 'string', 'max:255'],
            'area' => ['nullable', 'string', 'max:255'],
            'date_registered' => ['nullable', 'date'],
            'invoice_status' => ['nullable', 'in:pending,invoiced,paid'],
            'lab_type' => ['nullable', 'string', 'max:255'],
            'case_status' => ['nullable', 'string', 'max:255'],
        ]);

        $detail = LaboratoryDetail::firstOrCreate(['case_id' => $case->id]);
        $before = $detail->toArray();
        $detail->update($data);

        AuditService::log(
            'laboratory.updated',
            $case,
            ['before' => $before, 'after' => $detail->fresh()->toArray()],
            "Laboratory details updated for case {$case->case_number}."
        );

        return response()->json(['data' => $detail]);
    }
}
