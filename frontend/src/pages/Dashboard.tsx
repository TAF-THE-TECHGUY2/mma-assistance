import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  FolderOpen,
  CheckCircle2,
  BedDouble,
  Stethoscope,
  FlaskConical,
  ClipboardCheck,
  Receipt,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import StatCard from '../components/StatCard';
import DataTable, { type Column } from '../components/DataTable';
import FilterBar, { type FilterSelect } from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';
import CasesByStatusChart, {
  type CasesByStatusDatum,
} from '../components/charts/CasesByStatusChart';
import CasesByTypeChart, {
  type CasesByTypeDatum,
} from '../components/charts/CasesByTypeChart';
import MonthlyTrendsChart, {
  type MonthlyTrendDatum,
} from '../components/charts/MonthlyTrendsChart';

import { getDashboardStats } from '../api/dashboard';
import type {
  DashboardStats,
  MedicalCase,
  CaseType,
  CaseStatus,
} from '../types';

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

interface DashboardFilterValues {
  caseType: string;
  caseStatus: string;
  dateOpened: string;
}

const EMPTY_FILTERS: DashboardFilterValues = {
  caseType: '',
  caseStatus: '',
  dateOpened: '',
};

const FILTER_SELECTS: FilterSelect[] = [
  {
    key: 'caseType',
    label: 'Case Type',
    options: [
      { value: 'inpatient', label: 'Inpatient' },
      { value: 'outpatient', label: 'Outpatient' },
      { value: 'laboratory', label: 'Laboratory' },
    ],
  },
  {
    key: 'caseStatus',
    label: 'Case Status',
    options: [
      { value: 'booked', label: 'Booked' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'admin_review', label: 'Admin Review' },
      { value: 'billing', label: 'Billing' },
      { value: 'closed', label: 'Closed' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Stats normalization                                                         */
/* -------------------------------------------------------------------------- */

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function recordToStatusData(
  record: Record<string, number> | undefined | null,
): CasesByStatusDatum[] {
  if (!record) return [];
  return Object.entries(record).map(([status, count]) => ({
    status,
    count: num(count),
  }));
}

function recordToTypeData(
  record: Record<string, number> | undefined | null,
): CasesByTypeDatum[] {
  if (!record) return [];
  return Object.entries(record).map(([type, count]) => ({
    type,
    count: num(count),
  }));
}

/**
 * The canonical DashboardStats does not (yet) carry a monthly trend series.
 * Read it defensively so the chart lights up automatically if the backend
 * starts returning `monthly_trends`.
 */
function readMonthlyTrends(stats: DashboardStats): MonthlyTrendDatum[] {
  const raw = (stats as unknown as Record<string, unknown>).monthly_trends;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = item as Record<string, unknown>;
    return {
      month: String(obj.month ?? obj.label ?? obj.period ?? ''),
      opened: num(obj.opened ?? obj.created ?? obj.new),
      closed: num(obj.closed ?? obj.completed),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Recent cases table                                                          */
/* -------------------------------------------------------------------------- */

interface RecentCaseRow {
  id: number;
  caseNumber: string;
  patientName: string;
  caseType: CaseType;
  caseStatus: CaseStatus;
  dateOpened: string;
}

const CASE_TYPE_LABELS: Record<string, string> = {
  inpatient: 'Inpatient',
  outpatient: 'Outpatient',
  laboratory: 'Laboratory',
};

function caseToRow(c: MedicalCase): RecentCaseRow {
  const patient = c.patient;
  const patientName = patient
    ? `${patient.first_name ?? ''} ${patient.surname ?? ''}`.trim()
    : '';
  return {
    id: c.id,
    caseNumber: c.case_number,
    patientName: patientName || '—',
    caseType: c.case_type,
    caseStatus: c.case_status,
    dateOpened: c.date_opened,
  };
}

/* -------------------------------------------------------------------------- */
/* Workflow alerts                                                             */
/* -------------------------------------------------------------------------- */

type AlertTone = 'amber' | 'sky' | 'violet' | 'rose';

interface WorkflowAlert {
  id: string;
  label: string;
  count: number;
  tone: AlertTone;
  to: string;
}

function alertToneClasses(tone: AlertTone): string {
  switch (tone) {
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'sky':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'violet':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'rose':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-800';
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilterValues>(EMPTY_FILTERS);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load dashboard data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ----- Derived chart data ----- */
  const statusData = useMemo(
    () => recordToStatusData(stats?.cases_by_status),
    [stats],
  );
  const typeData = useMemo(
    () => recordToTypeData(stats?.cases_by_type),
    [stats],
  );
  const trendData = useMemo(
    () => (stats ? readMonthlyTrends(stats) : []),
    [stats],
  );

  /* ----- Derived: filtered recent cases ----- */
  const recentRows = useMemo<RecentCaseRow[]>(() => {
    const cases = stats?.recent_cases ?? [];
    return cases
      .filter((c) => {
        if (filters.caseType && c.case_type !== filters.caseType) return false;
        if (filters.caseStatus && c.case_status !== filters.caseStatus)
          return false;
        if (filters.dateOpened) {
          const opened = (c.date_opened ?? '').slice(0, 10);
          if (opened !== filters.dateOpened) return false;
        }
        return true;
      })
      .map(caseToRow);
  }, [stats, filters]);

  /* ----- Derived: workflow alerts ----- */
  const workflowAlerts = useMemo<WorkflowAlert[]>(() => {
    if (!stats) return [];
    const alerts: WorkflowAlert[] = [];

    if (stats.overdue_cases > 0) {
      alerts.push({
        id: 'overdue',
        label: 'Cases OVERDUE — past their due date',
        count: stats.overdue_cases,
        tone: 'rose',
        to: '/upcoming',
      });
    }
    if (stats.due_this_week > 0) {
      alerts.push({
        id: 'due-week',
        label: 'Cases due within 7 days',
        count: stats.due_this_week,
        tone: 'amber',
        to: '/upcoming',
      });
    }
    if (stats.pending_admin_review > 0) {
      alerts.push({
        id: 'admin-review',
        label: 'Cases awaiting admin review',
        count: stats.pending_admin_review,
        tone: 'amber',
        to: '/admin-review',
      });
    }
    if (stats.pending_billing > 0) {
      alerts.push({
        id: 'billing',
        label: 'Cases pending billing',
        count: stats.pending_billing,
        tone: 'violet',
        to: '/billing',
      });
    }
    if (stats.pending_documents > 0) {
      alerts.push({
        id: 'documents',
        label: 'Documents pending review',
        count: stats.pending_documents,
        tone: 'sky',
        to: '/documents',
      });
    }
    return alerts;
  }, [stats]);

  /* ----- Table columns ----- */
  const columns = useMemo<Column<RecentCaseRow>[]>(
    () => [
      {
        key: 'caseNumber',
        header: 'Case #',
        accessor: 'caseNumber',
        render: (row) => (
          <span className="font-medium text-slate-800">{row.caseNumber}</span>
        ),
      },
      {
        key: 'patientName',
        header: 'Patient',
        accessor: 'patientName',
      },
      {
        key: 'caseType',
        header: 'Type',
        accessor: 'caseType',
        render: (row) => (
          <span className="text-slate-600">
            {CASE_TYPE_LABELS[row.caseType] ?? row.caseType}
          </span>
        ),
      },
      {
        key: 'caseStatus',
        header: 'Status',
        accessor: 'caseStatus',
        render: (row) => <StatusBadge status={row.caseStatus} />,
      },
      {
        key: 'dateOpened',
        header: 'Date Opened',
        accessor: 'dateOpened',
        render: (row) => (
          <span className="text-slate-600">
            {row.dateOpened ? row.dateOpened.slice(0, 10) : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const filterValues: Record<string, string> = {
    caseType: filters.caseType,
    caseStatus: filters.caseStatus,
  };

  const hasActiveFilters =
    filters.caseType !== '' ||
    filters.caseStatus !== '' ||
    filters.dateOpened !== '';

  /* ----- Loading skeleton ----- */
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of patients, cases and workflow status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={stats?.total_patients ?? 0}
          icon={UsersIcon}
          accent="teal"
        />
        <StatCard
          label="Open Cases"
          value={stats?.open_cases ?? 0}
          icon={FolderOpen}
          accent="sky"
        />
        <StatCard
          label="Closed Cases"
          value={stats?.closed_cases ?? 0}
          icon={CheckCircle2}
          accent="slate"
        />
        <StatCard
          label="Inpatient"
          value={stats?.cases_by_type?.inpatient ?? 0}
          icon={BedDouble}
          accent="teal"
        />
        <StatCard
          label="Outpatient"
          value={stats?.cases_by_type?.outpatient ?? 0}
          icon={Stethoscope}
          accent="sky"
        />
        <StatCard
          label="Laboratory Requests"
          value={stats?.cases_by_type?.laboratory ?? 0}
          icon={FlaskConical}
          accent="violet"
        />
        <StatCard
          label="Pending Admin Review"
          value={stats?.pending_admin_review ?? 0}
          icon={ClipboardCheck}
          accent="amber"
        />
        <StatCard
          label="Pending Billing"
          value={stats?.pending_billing ?? 0}
          icon={Receipt}
          accent="violet"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Cases by Status
          </h2>
          <CasesByStatusChart data={statusData} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Cases by Type
          </h2>
          <CasesByTypeChart data={typeData} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">
          Monthly Trends
        </h2>
        <MonthlyTrendsChart data={trendData} />
      </div>

      {/* Workflow alerts */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Workflow Alerts
          </h2>
        </div>
        {workflowAlerts.length === 0 ? (
          <p className="text-sm text-slate-400">
            No outstanding workflow items. Everything is up to date.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workflowAlerts.map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => navigate(alert.to)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition hover:shadow-sm ${alertToneClasses(
                    alert.tone,
                  )}`}
                >
                  <span className="text-sm font-medium">{alert.label}</span>
                  <span className="ml-3 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-white/70 px-2 text-sm font-semibold">
                    {alert.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent cases */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent Cases</h2>
        </div>

        <FilterBar
          filters={FILTER_SELECTS}
          values={filterValues}
          onFilterChange={(key, value) =>
            setFilters((prev) => ({ ...prev, [key]: value }))
          }
          onClear={
            hasActiveFilters ? () => setFilters(EMPTY_FILTERS) : undefined
          }
        >
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">Date Opened</span>
            <input
              type="date"
              value={filters.dateOpened}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateOpened: e.target.value }))
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </FilterBar>

        <DataTable<RecentCaseRow>
          columns={columns}
          data={recentRows}
          searchable
          searchPlaceholder="Search recent cases..."
          onRowClick={(row) => navigate(`/cases/${row.id}`)}
          emptyMessage="No cases match the current filters."
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading skeleton                                                            */
/* -------------------------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
            <div className="h-8 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
      </div>

      <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />

      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}
