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
import { Download, FlaskConical, Pencil, Plus, Printer, RefreshCw, X } from 'lucide-react';

import type { InvoiceStatus, LaboratoryDetail, MedicalCase } from '../types';
import { getCases, getLaboratoryDetail, updateLaboratoryDetail } from '../api/cases';
import { downloadRegisterExcel } from '../api/registers';
import { printRegister, type PrintColumn } from '../print/registerPrint';
import DataTable, { type Column } from '../components/DataTable';

/** A case joined with its laboratory detail record, as rendered in the register. */
interface LaboratoryRow {
  case: MedicalCase;
  detail: LaboratoryDetail | null;
}

/** Mutable fields the operations team edits on a laboratory record. */
interface LaboratoryForm {
  appointment_date: string;
  treating_doctor: string;
  area: string;
  date_registered: string;
  invoice_status: InvoiceStatus;
  lab_type: string;
  case_status: string;
}

const EMPTY_FORM: LaboratoryForm = {
  appointment_date: '',
  treating_doctor: '',
  area: '',
  date_registered: '',
  invoice_status: 'pending',
  lab_type: '',
  case_status: '',
};

const INVOICE_STATUSES: InvoiceStatus[] = ['pending', 'invoiced', 'paid'];

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

function detailToForm(detail: LaboratoryDetail | null): LaboratoryForm {
  if (!detail) return { ...EMPTY_FORM };
  return {
    appointment_date: toDateInput(detail.appointment_date),
    treating_doctor: detail.treating_doctor ?? '',
    area: detail.area ?? '',
    date_registered: toDateInput(detail.date_registered),
    invoice_status: detail.invoice_status ?? 'pending',
    lab_type: detail.lab_type ?? '',
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

const INVOICE_STYLES: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  invoiced: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

function InvoiceBadge({ status }: { status?: InvoiceStatus | null }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${INVOICE_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export default function LaboratoryRequests() {
  const [rows, setRows] = useState<LaboratoryRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state.
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all'); // all | pending | invoiced | paid

  // Edit modal state.
  const [editing, setEditing] = useState<LaboratoryRow | null>(null);
  const [form, setForm] = useState<LaboratoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCases({ case_type: 'laboratory', per_page: 200 });
      const cases = toArray<MedicalCase>(result);

      const built = await Promise.all(
        cases.map(async (c) => {
          if (c.laboratory_detail) {
            return { case: c, detail: c.laboratory_detail } satisfies LaboratoryRow;
          }
          try {
            const detail = await getLaboratoryDetail(c.id);
            return { case: c, detail } satisfies LaboratoryRow;
          } catch {
            return { case: c, detail: null } satisfies LaboratoryRow;
          }
        })
      );

      setRows(built);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load laboratory requests.';
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
      if (invoiceFilter !== 'all' && r.detail?.invoice_status !== invoiceFilter) return false;
      return true;
    });
  }, [rows, statusFilter, invoiceFilter]);

  const handlePrint = useCallback(() => {
    const d = (v?: string | null) => (v ? fmtDate(v) : '');
    const columns: PrintColumn<LaboratoryRow>[] = [
      { header: 'Surname', value: (r) => r.case.patient?.surname ?? '' },
      { header: 'Name', value: (r) => r.case.patient?.first_name ?? '' },
      { header: 'DOB', value: (r) => d(r.case.patient?.date_of_birth) },
      { header: 'MMA File', value: (r) => r.case.file_number ?? r.case.patient?.mma_file_number ?? '' },
      { header: 'Date of Appointment', value: (r) => d(r.detail?.appointment_date) },
      { header: 'Treating Doctor', value: (r) => r.case.treating_doctor ?? r.detail?.treating_doctor ?? '' },
      { header: 'Area', value: (r) => r.detail?.area ?? '' },
      { header: 'Date Req', value: (r) => d(r.detail?.date_registered) },
    ];
    printRegister({
      title: 'LABORATORY AND PATHOLOGY OUT PATIENT INVOICE REQUEST',
      subtitle: `Date: ${new Date().toLocaleDateString()}`,
      columns,
      rows: filtered,
      orientation: 'portrait',
      minRows: 12,
    });
  }, [filtered]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      await downloadRegisterExcel('laboratory');
    } catch {
      setError('Failed to export the register to Excel.');
    } finally {
      setExporting(false);
    }
  }, []);

  const openEditor = useCallback((row: LaboratoryRow) => {
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
        appointment_date: nullable(form.appointment_date),
        treating_doctor: nullable(form.treating_doctor),
        area: nullable(form.area),
        date_registered: nullable(form.date_registered),
        invoice_status: form.invoice_status,
        lab_type: nullable(form.lab_type),
        case_status: nullable(form.case_status),
      };
      const updated = await updateLaboratoryDetail(editing.case.id, payload);
      setRows((prev) =>
        prev.map((r) => (r.case.id === editing.case.id ? { ...r, detail: updated } : r))
      );
      setEditing(null);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save laboratory details.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [editing, form]);

  const columns = useMemo<Column<LaboratoryRow>[]>(
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
        key: 'lab_type',
        header: 'Lab type',
        sortable: true,
        accessor: (r) => r.detail?.lab_type ?? '',
        render: (r) => r.detail?.lab_type ?? <span className="text-slate-400">—</span>,
      },
      {
        key: 'appointment_date',
        header: 'Appointment',
        sortable: true,
        accessor: (r) => r.detail?.appointment_date ?? '',
        render: (r) => fmtDate(r.detail?.appointment_date),
      },
      {
        key: 'treating_doctor',
        header: 'Treating doctor',
        sortable: true,
        accessor: (r) => r.case.treating_doctor ?? r.detail?.treating_doctor ?? '',
        render: (r) =>
          r.case.treating_doctor ?? r.detail?.treating_doctor ?? <span className="text-slate-400">—</span>,
      },
      {
        key: 'area',
        header: 'Area',
        sortable: true,
        accessor: (r) => r.detail?.area ?? '',
        render: (r) => r.detail?.area ?? <span className="text-slate-400">—</span>,
      },
      {
        key: 'date_registered',
        header: 'Registered',
        sortable: true,
        accessor: (r) => r.detail?.date_registered ?? '',
        render: (r) => fmtDate(r.detail?.date_registered),
      },
      {
        key: 'invoice_status',
        header: 'Invoice',
        sortable: true,
        accessor: (r) => r.detail?.invoice_status ?? '',
        render: (r) => <InvoiceBadge status={r.detail?.invoice_status} />,
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
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Laboratory Requests</h1>
            <p className="text-sm text-slate-500">
              Track lab appointments, request types, and invoicing for laboratory cases.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/cases/create?type=laboratory"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            New Lab Request
          </Link>
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
          <label htmlFor="lab-status" className="text-sm font-medium text-slate-600">
            Status
          </label>
          <select
            id="lab-status"
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
          <label htmlFor="lab-invoice" className="text-sm font-medium text-slate-600">
            Invoice
          </label>
          <select
            id="lab-invoice"
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} request{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable<LaboratoryRow>
          data={filtered}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Search by case number, patient, lab type, doctor..."
          rowKey={(r) => r.case.id}
          onRowClick={(r) => openEditor(r)}
          emptyMessage="No laboratory requests found."
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
  row: LaboratoryRow;
  form: LaboratoryForm;
  setForm: Dispatch<SetStateAction<LaboratoryForm>>;
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: () => void;
}

function EditModal({ row, form, setForm, saving, saveError, onClose, onSave }: EditModalProps) {
  const set = <K extends keyof LaboratoryForm>(key: K, value: LaboratoryForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputCls =
    'rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Edit Laboratory Details</h2>
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
            <Field label="Lab type">
              <input
                type="text"
                value={form.lab_type}
                onChange={(e) => set('lab_type', e.target.value)}
                placeholder="e.g. full blood count"
                className={inputCls}
              />
            </Field>
            <Field label="Appointment date">
              <input
                type="date"
                value={form.appointment_date}
                onChange={(e) => set('appointment_date', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Treating doctor">
              <input
                type="text"
                value={form.treating_doctor}
                onChange={(e) => set('treating_doctor', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Area">
              <input
                type="text"
                value={form.area}
                onChange={(e) => set('area', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Date registered">
              <input
                type="date"
                value={form.date_registered}
                onChange={(e) => set('date_registered', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Invoice status">
              <select
                value={form.invoice_status}
                onChange={(e) => set('invoice_status', e.target.value as InvoiceStatus)}
                className={inputCls}
              >
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Case status">
              <input
                type="text"
                value={form.case_status}
                onChange={(e) => set('case_status', e.target.value)}
                placeholder="e.g. awaiting results"
                className={inputCls}
              />
            </Field>
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
