<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\MedicalCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * GET /api/reports/{report}
     * Dispatch to a named report generator.
     */
    public function show(Request $request, string $report): JsonResponse
    {
        $canonical = $this->canonicalReportKey($report);

        $data = match ($canonical) {
            'cases-by-status' => $this->casesByStatus(),
            'cases-by-type' => $this->casesByType(),
            'open-cases-by-department' => $this->openByDepartment(),
            'closed-cases-this-month' => $this->closedThisMonth(),
            'pending-billing' => $this->pendingBilling(),
            'monthly-case-trends' => $this->monthlyTrends(),
            default => null,
        };

        if ($data === null) {
            return response()->json(['message' => "Unknown report: {$report}."], 404);
        }

        return response()->json([
            'data' => $data,
            'meta' => [
                'report' => $canonical ?? $report,
                'total' => count($data),
            ],
        ]);
    }

    private function canonicalReportKey(string $report): ?string
    {
        return match ($report) {
            'cases-by-status', 'casesByStatus' => 'cases-by-status',
            'cases-by-type', 'casesByType' => 'cases-by-type',
            'open-cases-by-department', 'openByDepartment' => 'open-cases-by-department',
            'closed-cases-this-month', 'closedThisMonth' => 'closed-cases-this-month',
            'pending-billing', 'pendingBilling' => 'pending-billing',
            'monthly-case-trends', 'monthlyTrends' => 'monthly-case-trends',
            default => null,
        };
    }

    /**
     * @return array<int, array{status: string, count: int}>
     */
    private function casesByStatus(): array
    {
        return MedicalCase::select('case_status', DB::raw('COUNT(*) as count'))
            ->groupBy('case_status')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->case_status,
                'count' => (int) $row->count,
            ])
            ->all();
    }

    /**
     * @return array<int, array{type: string, count: int}>
     */
    private function casesByType(): array
    {
        return MedicalCase::select('case_type', DB::raw('COUNT(*) as count'))
            ->groupBy('case_type')
            ->get()
            ->map(fn ($row) => [
                'type' => $row->case_type,
                'count' => (int) $row->count,
            ])
            ->all();
    }

    /**
     * @return array<int, array{department: string|null, count: int}>
     */
    private function openByDepartment(): array
    {
        return MedicalCase::select('assigned_department', DB::raw('COUNT(*) as count'))
            ->where('case_status', '!=', 'closed')
            ->groupBy('assigned_department')
            ->get()
            ->map(fn ($row) => [
                'department' => $row->assigned_department,
                'count' => (int) $row->count,
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function closedThisMonth(): array
    {
        $start = Carbon::now()->startOfMonth();
        $end = Carbon::now()->endOfMonth();

        return MedicalCase::with('patient')
            ->where('case_status', 'closed')
            ->whereBetween('updated_at', [$start, $end])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (MedicalCase $case) => [
                'case_id' => $case->id,
                'case_number' => $case->case_number,
                'case_type' => $case->case_type,
                'case_status' => $case->case_status,
                'patient_name' => trim(implode(' ', array_filter([
                    $case->patient?->first_name,
                    $case->patient?->surname,
                ]))),
                'closed_at' => $case->updated_at?->toDateString(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function pendingBilling(): array
    {
        return Billing::with('case.patient')
            ->where('billing_status', 'pending')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Billing $billing) => [
                'billing_id' => $billing->id,
                'case_id' => $billing->case_id,
                'case_number' => $billing->case?->case_number,
                'billing_status' => $billing->billing_status,
                'submission_date' => $billing->submission_date?->toDateString(),
                'date_pastel' => $billing->date_pastel?->toDateString(),
                'patient_name' => trim(implode(' ', array_filter([
                    $billing->case?->patient?->first_name,
                    $billing->case?->patient?->surname,
                ]))),
                'notes' => $billing->notes,
            ])
            ->all();
    }

    /**
     * Cases opened and closed per month over the trailing 12 months.
     *
     * @return array<int, array{month: string, opened: int, closed: int}>
     */
    private function monthlyTrends(): array
    {
        $months = [];
        $cursor = Carbon::now()->startOfMonth()->subMonths(11);

        for ($i = 0; $i < 12; $i++) {
            $key = $cursor->format('Y-m');
            $months[$key] = [
                'month' => $key,
                'opened' => 0,
                'closed' => 0,
            ];
            $cursor->addMonth();
        }

        $rangeStart = Carbon::now()->startOfMonth()->subMonths(11);

        foreach (
            MedicalCase::query()
                ->where('created_at', '>=', $rangeStart)
                ->get(['created_at']) as $case
        ) {
            $key = $case->created_at?->format('Y-m');

            if ($key && isset($months[$key])) {
                $months[$key]['opened']++;
            }
        }

        foreach (
            MedicalCase::query()
                ->where('case_status', 'closed')
                ->where('updated_at', '>=', $rangeStart)
                ->get(['updated_at']) as $case
        ) {
            $key = $case->updated_at?->format('Y-m');

            if ($key && isset($months[$key])) {
                $months[$key]['closed']++;
            }
        }

        return array_values($months);
    }
}
