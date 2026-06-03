import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase } from 'lucide-react';
import { getCases } from '../api/cases';
import type {
  MedicalCase,
  CaseType,
  CaseStatus,
  Priority,
} from '../types';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import FilterBar from '../components/FilterBar';

const CASE_TYPE_OPTIONS: { label: string; value: '' | CaseType }[] = [
  { label: 'All Types', value: '' },
  { label: 'Inpatient', value: 'inpatient' },
  { label: 'Outpatient', value: 'outpatient' },
  { label: 'Laboratory', value: 'laboratory' },
];

const CASE_STATUS_OPTIONS: { label: string; value: '' | CaseStatus }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Booked', value: 'booked' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Admin Review', value: 'admin_review' },
  { label: 'Billing', value: 'billing' },
  { label: 'Closed', value: 'closed' },
];

const PRIORITY_OPTIONS: { label: string; value: '' | Priority }[] = [
  { label: 'All Priorities', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
];

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function patientName(c: MedicalCase): string {
  const p = c.patient;
  if (!p) return '-';
  return `${p.first_name ?? ''} ${p.surname ?? ''}`.trim() || '-';
}

export default function Cases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<MedicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<'' | CaseType>('');
  const [statusFilter, setStatusFilter] = useState<'' | CaseStatus>('');
  const [priorityFilter, setPriorityFilter] = useState<'' | Priority>('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getCases()
      .then((res) => {
        if (active) setCases(res.data);
      })
      .catch((err: any) => {
        if (active)
          setError(
            err?.response?.data?.message ?? 'Failed to load cases.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (typeFilter && c.case_type !== typeFilter) return false;
      if (statusFilter && c.case_status !== statusFilter) return false;
      if (priorityFilter && c.priority !== priorityFilter) return false;
      return true;
    });
  }, [cases, typeFilter, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Cases</h1>
            <p className="text-sm text-slate-500">
              Manage and track all medical cases.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/cases/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Case
        </button>
      </div>

      <FilterBar>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | CaseType)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          {CASE_TYPE_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as '' | CaseStatus)
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          {CASE_STATUS_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as '' | Priority)
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable<MedicalCase>
          data={filtered}
          loading={loading}
          searchPlaceholder="Search cases..."
          searchKeys={['case_number', 'case_type', 'case_status']}
          onRowClick={(row) => navigate(`/cases/${row.id}`)}
          emptyMessage="No cases found."
          columns={[
            {
              key: 'case_number',
              header: 'Case #',
              sortable: true,
              render: (row) => (
                <span className="font-medium text-slate-800">
                  {row.case_number}
                </span>
              ),
            },
            {
              key: 'patient',
              header: 'Patient',
              render: (row) => patientName(row),
            },
            {
              key: 'case_type',
              header: 'Type',
              sortable: true,
              render: (row) => (
                <span className="capitalize text-slate-700">
                  {row.case_type}
                </span>
              ),
            },
            {
              key: 'case_status',
              header: 'Status',
              sortable: true,
              render: (row) => (
                <StatusBadge status={row.case_status} kind="case" />
              ),
            },
            {
              key: 'priority',
              header: 'Priority',
              sortable: true,
              render: (row) => (
                <StatusBadge status={row.priority} kind="priority" />
              ),
            },
            {
              key: 'workflow_stage',
              header: 'Stage',
              sortable: true,
              render: (row) => (
                <span className="capitalize text-slate-700">
                  {row.workflow_stage.replace('_', ' ')}
                </span>
              ),
            },
            {
              key: 'date_opened',
              header: 'Opened',
              sortable: true,
              render: (row) => formatDate(row.date_opened),
            },
          ]}
        />
      </div>
    </div>
  );
}
