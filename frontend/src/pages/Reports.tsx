import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CreditCard,
  Download,
  LineChart,
  Loader2,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';

import { getReport } from '../api/reports';
import CasesByStatusChart, {
  type CasesByStatusDatum,
} from '../components/charts/CasesByStatusChart';
import CasesByTypeChart, {
  type CasesByTypeDatum,
} from '../components/charts/CasesByTypeChart';
import MonthlyTrendsChart, {
  type MonthlyTrendDatum,
} from '../components/charts/MonthlyTrendsChart';

/* ------------------------------------------------------------------ */
/* Report definitions                                                  */
/* ------------------------------------------------------------------ */

type ReportKey =
  | 'cases-by-status'
  | 'cases-by-type'
  | 'open-cases-by-department'
  | 'closed-cases-this-month'
  | 'pending-billing'
  | 'monthly-case-trends';

interface ReportDef {
  key: ReportKey;
  title: string;
  description: string;
  icon: typeof BarChart3;
}

const REPORTS: ReportDef[] = [
  {
    key: 'cases-by-status',
    title: 'Cases by Status',
    description: 'Distribution of cases across each status.',
    icon: BarChart3,
  },
  {
    key: 'cases-by-type',
    title: 'Cases by Type',
    description: 'Inpatient, outpatient and laboratory breakdown.',
    icon: PieIcon,
  },
  {
    key: 'open-cases-by-department',
    title: 'Open Cases by Department',
    description: 'Active workload per assigned department.',
    icon: Building2,
  },
  {
    key: 'closed-cases-this-month',
    title: 'Closed Cases This Month',
    description: 'Cases closed during the current calendar month.',
    icon: CalendarCheck,
  },
  {
    key: 'pending-billing',
    title: 'Pending Billing',
    description: 'Cases awaiting billing submission or completion.',
    icon: CreditCard,
  },
  {
    key: 'monthly-case-trends',
    title: 'Monthly Case Trends',
    description: 'Cases opened vs. closed over recent months.',
    icon: LineChart,
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function humanize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(value: unknown): string {
  const s = asString(value);
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString();
}

/** Picks the first present key from a row, case-insensitively. */
function pick(row: Row, keys: string[]): unknown {
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const k of keys) {
    if (k in row) return row[k];
    if (k.toLowerCase() in lower) return lower[k.toLowerCase()];
  }
  return undefined;
}

/** Builds and downloads a CSV file from an array of objects. */
function exportToCsv(filename: string, rows: Row[]): void {
  if (rows.length === 0) return;
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  const escape = (value: unknown): string => {
    const s =
      value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  const csv = lines.join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface ReportState {
  rows: Row[];
  loading: boolean;
  error: string | null;
}

type StateMap = Record<ReportKey, ReportState>;

const initialState = (): StateMap =>
  REPORTS.reduce((acc, r) => {
    acc[r.key] = { rows: [], loading: true, error: null };
    return acc;
  }, {} as StateMap);

export default function Reports() {
  const [state, setState] = useState<StateMap>(initialState);

  const loadOne = useCallback(async (key: ReportKey) => {
    setState((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null },
    }));
    try {
      const res = await getReport<Row>(key);
      setState((prev) => ({
        ...prev,
        [key]: { rows: res.data ?? [], loading: false, error: null },
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (err instanceof Error ? err.message : null) ??
        'Failed to load report.';
      setState((prev) => ({
        ...prev,
        [key]: { rows: [], loading: false, error: message },
      }));
    }
  }, []);

  const loadAll = useCallback(() => {
    REPORTS.forEach((r) => void loadOne(r.key));
  }, [loadOne]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ----- Derived chart datasets ----- */

  const statusData: CasesByStatusDatum[] = useMemo(
    () =>
      state['cases-by-status'].rows.map((r) => ({
        status: asString(pick(r, ['status', 'case_status', 'label'])),
        count: asNumber(pick(r, ['count', 'total', 'value'])),
      })),
    [state],
  );

  const typeData: CasesByTypeDatum[] = useMemo(
    () =>
      state['cases-by-type'].rows.map((r) => ({
        type: asString(pick(r, ['type', 'case_type', 'label'])),
        count: asNumber(pick(r, ['count', 'total', 'value'])),
      })),
    [state],
  );

  const trendData: MonthlyTrendDatum[] = useMemo(
    () =>
      state['monthly-case-trends'].rows.map((r) => ({
        month: asString(pick(r, ['month', 'period', 'label'])),
        opened: asNumber(pick(r, ['opened', 'opened_count', 'new'])),
        closed: asNumber(pick(r, ['closed', 'closed_count'])),
      })),
    [state],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Reports</h1>
            <p className="text-sm text-slate-500">
              Operational and financial insights across the practice.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </button>
      </header>

      {/* Cases by Status + Cases by Type (charts) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportCard
          def={REPORTS[0]}
          state={state['cases-by-status']}
          onExport={() =>
            exportToCsv('cases-by-status.csv', state['cases-by-status'].rows)
          }
        >
          <CasesByStatusChart data={statusData} />
        </ReportCard>

        <ReportCard
          def={REPORTS[1]}
          state={state['cases-by-type']}
          onExport={() =>
            exportToCsv('cases-by-type.csv', state['cases-by-type'].rows)
          }
        >
          <CasesByTypeChart data={typeData} />
        </ReportCard>
      </div>

      {/* Monthly Case Trends (full width chart) */}
      <ReportCard
        def={REPORTS[5]}
        state={state['monthly-case-trends']}
        onExport={() =>
          exportToCsv(
            'monthly-case-trends.csv',
            state['monthly-case-trends'].rows,
          )
        }
      >
        <MonthlyTrendsChart data={trendData} />
      </ReportCard>

      {/* Open Cases by Department (table) */}
      <ReportCard
        def={REPORTS[2]}
        state={state['open-cases-by-department']}
        onExport={() =>
          exportToCsv(
            'open-cases-by-department.csv',
            state['open-cases-by-department'].rows,
          )
        }
      >
        <SimpleTable
          rows={state['open-cases-by-department'].rows}
          columns={[
            {
              header: 'Department',
              render: (r) =>
                humanize(
                  asString(
                    pick(r, ['department', 'assigned_department', 'label']),
                  ),
                ) || '—',
            },
            {
              header: 'Open Cases',
              align: 'right',
              render: (r) => asNumber(pick(r, ['count', 'open_cases', 'total'])),
            },
          ]}
          emptyMessage="No open cases by department."
        />
      </ReportCard>

      {/* Closed Cases This Month + Pending Billing (tables) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportCard
          def={REPORTS[3]}
          state={state['closed-cases-this-month']}
          onExport={() =>
            exportToCsv(
              'closed-cases-this-month.csv',
              state['closed-cases-this-month'].rows,
            )
          }
        >
          <SimpleTable
            rows={state['closed-cases-this-month'].rows}
            columns={[
              {
                header: 'Case #',
                render: (r) =>
                  asString(pick(r, ['case_number', 'case', 'id'])) || '—',
              },
              {
                header: 'Type',
                render: (r) =>
                  humanize(asString(pick(r, ['case_type', 'type']))) || '—',
              },
              {
                header: 'Closed',
                render: (r) =>
                  fmtDate(pick(r, ['admin_closure_date', 'closed_at', 'date'])),
              },
            ]}
            emptyMessage="No cases closed this month."
          />
        </ReportCard>

        <ReportCard
          def={REPORTS[4]}
          state={state['pending-billing']}
          onExport={() =>
            exportToCsv('pending-billing.csv', state['pending-billing'].rows)
          }
        >
          <SimpleTable
            rows={state['pending-billing'].rows}
            columns={[
              {
                header: 'Case #',
                render: (r) =>
                  asString(pick(r, ['case_number', 'case', 'case_id'])) || '—',
              },
              {
                header: 'Status',
                render: (r) =>
                  humanize(asString(pick(r, ['billing_status', 'status']))) ||
                  '—',
              },
              {
                header: 'Submitted',
                render: (r) => fmtDate(pick(r, ['submission_date', 'date'])),
              },
            ]}
            emptyMessage="No pending billing records."
          />
        </ReportCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

interface ReportCardProps {
  def: ReportDef;
  state: ReportState;
  onExport: () => void;
  children: ReactNode;
}

function ReportCard({ def, state, onExport, children }: ReportCardProps) {
  const Icon = def.icon;
  const canExport = !state.loading && !state.error && state.rows.length > 0;

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {def.title}
            </h2>
            <p className="text-xs text-slate-500">{def.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Export to CSV"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
      </div>

      <div className="flex-1 p-5">
        {state.loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : state.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

interface SimpleColumn {
  header: string;
  align?: 'left' | 'right';
  render: (row: Row) => ReactNode;
}

interface SimpleTableProps {
  rows: Row[];
  columns: SimpleColumn[];
  emptyMessage: string;
}

function SimpleTable({ rows, columns, emptyMessage }: SimpleTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                className={`px-3 py-2 ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td
                  key={c.header}
                  className={`px-3 py-2 ${
                    c.align === 'right'
                      ? 'text-right font-medium text-slate-800'
                      : 'text-left'
                  }`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
