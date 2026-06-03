import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, RefreshCw } from 'lucide-react';

import type { CaseType, MedicalCase } from '../types';
import { getUpcomingCases, updateCase } from '../api/cases';
import DataTable, { type Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const TYPE_OPTIONS: { label: string; value: '' | CaseType }[] = [
  { label: 'All Types', value: '' },
  { label: 'Inpatient', value: 'inpatient' },
  { label: 'Outpatient', value: 'outpatient' },
  { label: 'Laboratory', value: 'laboratory' },
];

/** Whole-day difference between a due date and today (negative = overdue). */
function daysUntil(due?: string | null): number | null {
  if (!due) return null;
  const d = new Date(due.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

type Bucket = 'overdue' | 'week' | 'month' | 'later' | 'none';

function bucketOf(due?: string | null): Bucket {
  const n = daysUntil(due);
  if (n === null) return 'none';
  if (n < 0) return 'overdue';
  if (n <= 7) return 'week';
  if (n <= 31) return 'month';
  return 'later';
}

function dueLabel(due?: string | null): { text: string; cls: string } {
  const n = daysUntil(due);
  if (n === null) return { text: 'No due date', cls: 'bg-slate-100 text-slate-500' };
  if (n < 0) return { text: `Overdue ${Math.abs(n)}d`, cls: 'bg-rose-100 text-rose-700' };
  if (n === 0) return { text: 'Due today', cls: 'bg-orange-100 text-orange-700' };
  if (n <= 7) return { text: `Due in ${n}d`, cls: 'bg-amber-100 text-amber-700' };
  if (n <= 31) return { text: `Due in ${n}d`, cls: 'bg-sky-100 text-sky-700' };
  return { text: `Due in ${n}d`, cls: 'bg-slate-100 text-slate-600' };
}

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function patientName(c: MedicalCase): string {
  return c.patient ? `${c.patient.first_name ?? ''} ${c.patient.surname ?? ''}`.trim() : '—';
}

export default function UpcomingCases() {
  const [rows, setRows] = useState<MedicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'' | CaseType>('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUpcomingCases(typeFilter ? { case_type: typeFilter } : {});
      setRows(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load upcoming cases.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSetDue = useCallback(async (id: number, value: string) => {
    setSavingId(id);
    setError(null);
    try {
      const updated = await updateCase(id, { due_date: value || null });
      setRows((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, due_date: updated.due_date } : c))
          .sort((a, b) => {
            // keep dated-first, soonest-first ordering
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return a.due_date.localeCompare(b.due_date);
          }),
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Could not update the due date (your role may not have permission).',
      );
    } finally {
      setSavingId(null);
    }
  }, []);

  const counts = useMemo(() => {
    const c = { overdue: 0, week: 0, month: 0, later: 0, none: 0 };
    for (const r of rows) c[bucketOf(r.due_date)]++;
    return c;
  }, [rows]);

  const columns = useMemo<Column<MedicalCase>[]>(
    () => [
      {
        key: 'due',
        header: 'Due',
        accessor: (c) => c.due_date ?? '9999-99-99', // undated sort last
        sortable: true,
        render: (c) => {
          const { text, cls } = dueLabel(c.due_date);
          return (
            <div className="flex flex-col gap-1">
              <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
                {text}
              </span>
              <input
                type="date"
                value={c.due_date ? c.due_date.slice(0, 10) : ''}
                disabled={savingId === c.id}
                onChange={(e) => void handleSetDue(c.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-36 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </div>
          );
        },
      },
      {
        key: 'case_number',
        header: 'Case #',
        accessor: (c) => c.case_number,
        sortable: true,
        render: (c) => (
          <Link
            to={`/cases/${c.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-teal-700 hover:underline"
          >
            {c.case_number}
          </Link>
        ),
      },
      { key: 'patient', header: 'Patient', accessor: (c) => patientName(c), render: (c) => patientName(c) },
      {
        key: 'case_type',
        header: 'Type',
        accessor: (c) => c.case_type,
        sortable: true,
        render: (c) => <span className="capitalize text-slate-700">{c.case_type}</span>,
      },
      { key: 'priority', header: 'Priority', render: (c) => <StatusBadge status={c.priority} /> },
      { key: 'case_status', header: 'Status', render: (c) => <StatusBadge status={c.case_status} /> },
      {
        key: 'assigned_department',
        header: 'Department',
        render: (c) => c.assigned_department ?? '—',
      },
      { key: 'date_opened', header: 'Opened', render: (c) => fmtDate(c.date_opened) },
    ],
    [savingId, handleSetDue],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Upcoming Cases</h1>
            <p className="text-sm text-slate-500">
              Cases due soon or overdue, sorted by due date — set a due date on anything that's missing one.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as '' | CaseType)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <SummaryChip label="Overdue" value={counts.overdue} tone="rose" alert />
        <SummaryChip label="Due this week" value={counts.week} tone="amber" />
        <SummaryChip label="Due this month" value={counts.month} tone="sky" />
        <SummaryChip label="Later" value={counts.later} tone="slate" />
        <SummaryChip label="No due date" value={counts.none} tone="slate" />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable<MedicalCase>
        data={rows}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder="Search by case number, patient..."
        searchKeys={['case_number', 'case_type', 'assigned_department']}
        rowKey={(c) => c.id}
        pageSize={25}
        emptyMessage="No open cases. 🎉"
      />
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
  alert = false,
}: {
  label: string;
  value: number;
  tone: 'rose' | 'amber' | 'sky' | 'slate';
  alert?: boolean;
}) {
  const tones: Record<string, string> = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    slate: 'border-slate-200 bg-white text-slate-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {alert && value > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
