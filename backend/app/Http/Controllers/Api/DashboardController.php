<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\MedicalCase;
use App\Models\Patient;
use Illuminate\Support\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/stats
     * Aggregate counts plus the most recent cases.
     */
    public function stats(Request $request): JsonResponse
    {
        $casesByStatus = $this->countBy(
            'case_status',
            [
                MedicalCase::STATUS_BOOKED,
                MedicalCase::STATUS_IN_PROGRESS,
                MedicalCase::STATUS_ADMIN_REVIEW,
                MedicalCase::STATUS_BILLING,
                MedicalCase::STATUS_CLOSED,
            ],
        );

        $casesByType = $this->countBy(
            'case_type',
            [
                MedicalCase::TYPE_INPATIENT,
                MedicalCase::TYPE_OUTPATIENT,
                MedicalCase::TYPE_LABORATORY,
            ],
        );

        $casesByStage = $this->countBy(
            'workflow_stage',
            [
                MedicalCase::STAGE_OPERATIONS,
                MedicalCase::STAGE_ADMIN_REVIEW,
                MedicalCase::STAGE_BILLING,
                MedicalCase::STAGE_CLOSED,
            ],
        );

        $recentCases = MedicalCase::with('patient')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'total_patients' => Patient::count(),
                'total_cases' => MedicalCase::count(),
                'open_cases' => MedicalCase::where('case_status', '!=', MedicalCase::STATUS_CLOSED)->count(),
                'closed_cases' => MedicalCase::where('case_status', MedicalCase::STATUS_CLOSED)->count(),
                'cases_by_status' => $casesByStatus,
                'cases_by_type' => $casesByType,
                'cases_by_stage' => $casesByStage,
                'pending_billing' => $casesByStage[MedicalCase::STAGE_BILLING],
                'pending_admin_review' => $casesByStage[MedicalCase::STAGE_ADMIN_REVIEW],
                'pending_documents' => Document::where('document_status', 'pending')->count(),
                'overdue_cases' => MedicalCase::whereNotNull('due_date')
                    ->whereDate('due_date', '<', now()->toDateString())
                    ->where('case_status', '!=', MedicalCase::STATUS_CLOSED)
                    ->count(),
                'due_this_week' => MedicalCase::whereNotNull('due_date')
                    ->whereDate('due_date', '>=', now()->toDateString())
                    ->whereDate('due_date', '<=', now()->addDays(7)->toDateString())
                    ->where('case_status', '!=', MedicalCase::STATUS_CLOSED)
                    ->count(),
                'recent_cases' => $recentCases,
                'monthly_trends' => $this->monthlyTrends(),
            ],
        ]);
    }

    /**
     * Count cases by a canonical enum column and return zero-filled keys.
     *
     * @param  array<int, string>  $keys
     * @return array<string, int>
     */
    private function countBy(string $column, array $keys): array
    {
        $counts = array_fill_keys($keys, 0);

        foreach (
            MedicalCase::query()
                ->selectRaw("{$column} as value, COUNT(*) as aggregate")
                ->groupBy($column)
                ->get() as $row
        ) {
            if (is_string($row->value) && array_key_exists($row->value, $counts)) {
                $counts[$row->value] = (int) $row->aggregate;
            }
        }

        return $counts;
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
                ->where('case_status', MedicalCase::STATUS_CLOSED)
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
