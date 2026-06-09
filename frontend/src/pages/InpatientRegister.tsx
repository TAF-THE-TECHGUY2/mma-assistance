import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Download, Pencil, Printer, RefreshCw, X } from 'lucide-react';

import type { InpatientDetail, MedicalCase } from '../types';
import { getCases, getInpatientDetail, updateInpatientDetail } from '../api/cases';
import { downloadRegisterExcel } from '../api/registers';
import { printRegister, type PrintColumn } from '../print/registerPrint';
import DataTable, { type Column } from '../components/DataTable';

/**
 * A case joined with its inpatient detail record, as rendered in the register.
 */
interface InpatientRow {
  case: MedicalCase;
  detail: InpatientDetail | null;
}

/** Mutable fields the operations team edits on an inpatient record. */
interface InpatientForm {
  file_number: string;
  admission_date: string;
  discharge_date: string;
  date_to_admin: string;
  mr_requested: boolean;
  mr_received: boolean;
  admin_closure_date: string;
  submission_date: string;
  date_pastel: string;
  case_status: string;
}

const EMPTY_FORM: InpatientForm = {
  file_number: '',
  admission_date: '',
  discharge_date: '',
  date_to_admin: '',
  mr_requested: false,
  mr_received: false,
  admin_closure_date: '',
  submission_date: '',
  date_pastel: '',
  case_status: '',
};

/** Normalises the various shapes a list endpoint may return into an array. */
function toArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { data?: unknown }).data)) {
    return (result as { data: T[] }).data;
  }
  return [];
}

/** Renders an ISO date string as a short local date, or an em dash if absent. */
function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

/** Slices an ISO/timestamp string down to a yyyy-mm-dd value for date inputs. */
function toDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/** Converts an empty form string into null so the API stores NULL, not "". */
function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function detailToForm(detail: InpatientDetail | null): InpatientForm {
  if (!detail) return { ...EMPTY_FORM };
  return {
    file_number: detail.file_number ?? '',
    admission_date: toDateInput(detail.admission_date),
    discharge_date: toDateInput(detail.discharge_date),
    date_to_admin: toDateInput(detail.date_to_admin),
    mr_requested: Boolean(detail.mr_requested),
    mr_received: Boolean(detail.mr_received),
    admin_closure_date: toDateInput(detail.admin_closure_date),
    submission_date: toDateInput(detail.submission_date),
    date_pastel: toDateInput(detail.date_pastel),
    case_status: detail.case_status ?? '',
  };
}

const STATUS_STYLES: Record<string, string> = {
  booked: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  admin_review: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  billing: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const cls = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function YesNo({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        value ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
}

export default function InpatientRegister() {
  const [rows, setRows] = useState<InpatientRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state.
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mrFilter, setMrFilter] = useState<string>('all'); // all | requested | received | none

  // Edit modal state.
  const [editing, setEditing] = useState<InpatientRow | null>(null);
  const [form, setForm] = useState<InpatientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCases({ case_type: 'inpatient', per_page: 200 });
      const cases = toArray<MedicalCase>(result);

      // The list endpoint does not eager-load detail rows, so fetch each
      // case's inpatient detail. Failures degrade gracefully to a null detail.
      const built = await Promise.all(
        cases.map(async (c) => {
          if (c.inpatient_detail) {
            return { case: c, detail: c.inpatient_detail } satisfies InpatientRow;
          }
          try {
            const detail = await getInpatientDetail(c.id);
            return { case: c, detail } satisfies InpatientRow;
          } catch {
            return { case: c, detail: null } satisfies InpatientRow;
          }
        })
      );

      setRows(built);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load the inpatient register.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.case.case_status !== statusFilter) return false;
      if (mrFilter === 'requested' && !r.detail?.mr_requested) return false;
      if (mrFilter === 'received' && !r.detail?.mr_received) return false;
      if (mrFilter === 'none' && (r.detail?.mr_requested || r.detail?.mr_received)) return false;
      return true;
    });
  }, [rows, statusFilter, mrFilter]);

  const handlePrint = useCallback(() => {
    const d = (v?: string | null) => (v ? fmtDate(v) : '');
    const columns: PrintColumn<InpatientRow>[] = [
      { header: 'File Date', value: (r) => d(r.case.date_opened) },
      { header: 'File No', value: (r) => r.case.file_number ?? r.detail?.file_number ?? '' },
      {
        header: 'Name of Patient',
        value: (r) => (r.case.patient ? `${r.case.patient.first_name} ${r.case.patient.surname}` : ''),
      },
      { header: 'Admission Date', value: (r) => d(r.detail?.admission_date) },
      { header: 'Discharge Date', value: (r) => d(r.detail?.discharge_date) },
      { header: 'Date to Admin', value: (r) => d(r.detail?.date_to_admin) },
      { header: 'MR Req', value: (r) => (r.detail?.mr_requested ? 'Yes' : 'No') },
      { header: 'MR Rec', value: (r) => (r.detail?.mr_received ? 'Yes' : 'No') },
      { header: 'Admin Closure Date', value: (r) => d(r.detail?.admin_closure_date) },
      { header: 'Submission Date', value: (r) => d(r.detail?.submission_date) },
      { header: 'Date Pastel', value: (r) => d(r.detail?.date_pastel) },
    ];
    printRegister({ title: 'IN PATIENT MANAGEMENT REGISTER', columns, rows: filtered, orientation: 'landscape', minRows: 15 });
  }, [filtered]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      await downloadRegisterExcel('inpatient');
    } catch {
      setError('Failed to export the register to Excel.');
    } finally {
      setExporting(false);
    }
  }, []);

  const openEditor = useCallback((row: InpatientRow) => {
    setEditing(row);
    setForm(detailToForm(row.detail));
    setSaveError(null);
  }, []);

  const closeEditor = useCallback(() => {
    if (saving) return;
    setEditing(null);
    setSaveError(null);
  }, [saving]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        file_number: nullable(form.file_number),
        admission_date: nullable(form.admission_date),
        discharge_date: nullable(form.discharge_date),
        date_to_admin: nullable(form.date_to_admin),
        mr_requested: form.mr_requested,
        mr_received: form.mr_received,
        admin_closure_date: nullable(form.admin_closure_date),
        submission_date: nullable(form.submission_date),
        date_pastel: nullable(form.date_pastel),
        case_status: nullable(form.case_status),
      };
      const updated = await updateInpatientDetail(editing.case.id, payload);
      setRows((prev) =>
        prev.map((r) => (r.case.id === editing.case.id ? { ...r, detail: updated } : r))
      );
      setEditing(null);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save inpatient details.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [editing, form]);

  const columns = useMemo<Column<InpatientRow>[]>(
    () => [
      {
        key: 'case_number',
        header: 'Case #',
        sortable: true,
        accessor: (r) => r.case.case_number,
        render: (r) => (
          <Link
            to={`/cases/${r.case.id}`}
            className="font-medium text-teal-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.case.case_number}
          </Link>
        ),
      },
      {
        key: 'patient',
        header: 'Patient',
        sortable: true,
        accessor: (r) =>
          r.case.patient ? `${r.case.patient.first_name} ${r.case.patient.surname}` : '',
        render: (r) =>
          r.case.patient ? (
            <Link
              to={`/patients/${r.case.patient.id}`}
              className="text-slate-800 hover:text-teal-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {r.case.patient.first_name} {r.case.patient.surname}
            </Link>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: 'file_number',
        header: 'File #',
        sortable: true,
        accessor: (r) => r.case.file_number ?? r.detail?.file_number ?? '',
        render: (r) =>
          r.case.file_number ?? r.detail?.file_number ?? <span className="text-slate-400">—</span>,
      },
      {
        key: 'admission_date',
        header: 'Admitted',
        sortable: true,
        accessor: (r) => r.detail?.admission_date ?? '',
        render: (r) => fmtDate(r.detail?.admission_date),
      },
      {
        key: 'discharge_date',
        header: 'Discharged',
        sortable: true,
        accessor: (r) => r.detail?.discharge_date ?? '',
        render: (r) => fmtDate(r.detail?.discharge_date),
      },
      {
        key: 'date_to_admin',
        header: 'To Admin',
        sortable: true,
        accessor: (r) => r.detail?.date_to_admin ?? '',
        render: (r) => fmtDate(r.detail?.date_to_admin),
      },
      {
        key: 'mr_requested',
        header: 'MR Req.',
        sortable: true,
        accessor: (r) => (r.detail?.mr_requested ? 1 : 0),
        render: (r) => <YesNo value={Boolean(r.detail?.mr_requested)} />,
      },
      {
        key: 'mr_received',
        header: 'MR Rec.',
        sortable: true,
        accessor: (r) => (r.detail?.mr_received ? 1 : 0),
        render: (r) => <YesNo value={Boolean(r.detail?.mr_received)} />,
      },
      {
        key: 'case_status',
        header: 'Status',
        sortable: true,
        accessor: (r) => r.case.case_status,
        render: (r) => <StatusBadge status={r.case.case_status} />,
      },
      {
        key: 'actions',
        header: '',
        sortable: false,
        accessor: () => '',
        render: (r) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditor(r);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ),
      },
    ],
    [openEditor]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Inpatient Register</h1>
            <p className="text-sm text-slate-500">
              Track admissions, discharges, and medical-record requests for inpatient cases.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="ip-status" className="text-sm font-medium text-slate-600">
            Status
          </label>
          <select
            id="ip-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            <option value="all">All</option>
            <option value="booked">Booked</option>
            <option value="in_progress">In progress</option>
            <option value="admin_review">Admin review</option>
            <option value="billing">Billing</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="ip-mr" className="text-sm font-medium text-slate-600">
            Medical record
          </label>
          <select
            id="ip-mr"
            value={mrFilter}
            onChange={(e) => setMrFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            <option value="all">All</option>
            <option value="requested">Requested</option>
            <option value="received">Received</option>
            <option value="none">Not requested</option>
          </select>
        </div>
        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} case{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable<InpatientRow>
          data={filtered}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Search by case number, patient, file number..."
          rowKey={(r) => r.case.id}
          onRowClick={(r) => openEditor(r)}
          emptyMessage="No inpatient cases found."
        />
      </div>

      {editing && (
        <EditModal
          row={editing}
          form={form}
          setForm={setForm}
          saving={saving}
          saveError={saveError}
          onClose={closeEditor}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

interface EditModalProps {
  row: InpatientRow;
  form: InpatientForm;
  setForm: Dispatch<SetStateAction<InpatientForm>>;
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: () => void;
}

function EditModal({ row, form, setForm, saving, saveError, onClose, onSave }: EditModalProps) {
  const set = <K extends keyof InpatientForm>(key: K, value: InpatientForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Edit Inpatient Details</h2>
            <p className="text-sm text-slate-500">{row.case.case_number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="File number">
              <input
                type="text"
                value={form.file_number}
                onChange={(e) => set('file_number', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
            <Field label="Case status">
              <input
                type="text"
                value={form.case_status}
                onChange={(e) => set('case_status', e.target.value)}
                placeholder="e.g. awaiting discharge"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
            <Field label="Admission date">
              <input
                type="date"
                value={form.admission_date}
                onChange={(e) => set('admission_date', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
            <Field label="Discharge date">
              <input
                type="date"
                value={form.discharge_date}
                onChange={(e) => set('discharge_date', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
            <Field label="Date to admin">
              <input
                type="date"
                value={form.date_to_admin}
                onChange={(e) => set('date_to_admin', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
            <Field label="Admin closure date">
              <input
                type="date"
                value={form.admin_closure_date}
                onChange={(e) => set('admin_closure_date', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
            <Field label="Submission date">
              <input
                type="date"
                value={form.submission_date}
                onChange={(e) => set('submission_date', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
            <Field label="Date to Pastel">
              <input
                type="date"
                value={form.date_pastel}
                onChange={(e) => set('date_pastel', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.mr_requested}
                onChange={(e) => set('mr_requested', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Medical record requested
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.mr_received}
                onChange={(e) => set('mr_received', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Medical record received
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
