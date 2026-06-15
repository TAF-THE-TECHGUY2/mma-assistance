import { useCallback, useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Upload,
  FileText,
  User,
  ClipboardList,
  History,
  Send,
  Lock,
  XCircle,
} from 'lucide-react';
import {
  getCase,
  sendToOperations,
  sendToAdminReview,
  sendToBilling,
  closeCase,
  cancelCase,
  type CancellationReasonValue,
} from '../api/cases';
import { createDocument } from '../api/documents';
import type {
  MedicalCase,
  WorkflowStage,
} from '../types';
import StatusBadge from '../components/StatusBadge';

const WORKFLOW_STEPS: { stage: WorkflowStage; label: string }[] = [
  { stage: 'operations', label: 'Operations' },
  { stage: 'admin_review', label: 'Admin Review' },
  { stage: 'billing', label: 'Billing' },
  { stage: 'closed', label: 'Closed' },
];

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function prettyLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<MedicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReasonValue>('no_show');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCase(Number(id));
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load case.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(
    name: string,
    fn: (caseId: number) => Promise<unknown>,
  ) {
    if (!data) return;
    setActionPending(name);
    setActionError(null);
    try {
      await fn(data.id);
      await load();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? `Failed to ${name}.`,
      );
    } finally {
      setActionPending(null);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    if (!docFile) {
      setActionError('Please choose a file to upload.');
      return;
    }
    setUploading(true);
    setActionError(null);
    try {
      const form = new FormData();
      form.append('name', docName || docFile.name);
      form.append('file', docFile);
      form.append('case_id', String(data.id));
      if (data.patient_id)
        form.append('patient_id', String(data.patient_id));
      if (docType) form.append('document_type', docType);
      await createDocument(form);
      setShowUpload(false);
      setDocName('');
      setDocType('');
      setDocFile(null);
      await load();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? 'Failed to upload document.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCancel() {
    if (!data) return;
    setCancelling(true);
    setActionError(null);
    try {
      await cancelCase(data.id, cancelReason);
      setShowCancel(false);
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to cancel the case.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading case...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Case not found.'}
        </div>
      </div>
    );
  }

  const c = data;
  const patient = c.patient;
  const detail =
    c.inpatient_detail ?? c.outpatient_detail ?? c.laboratory_detail ?? null;
  const documents = c.documents ?? [];
  const auditLogs = c.audit_logs ?? [];

  const currentStageIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.stage === c.workflow_stage,
  );
  const isClosed = c.case_status === 'closed';
  const isCancelled = c.case_status === 'cancelled';
  const isInactive = isClosed || isCancelled;
  const REASON_LABELS: Record<CancellationReasonValue, string> = {
    no_show: 'No-show',
    patient_cancelled: 'Patient cancelled',
    client_cancelled: 'Client cancelled',
    other: 'Other',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/cases')}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              {c.case_number}
            </h1>
            <p className="text-sm capitalize text-slate-500">
              {c.case_type} case
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.case_status} kind="case" />
          <StatusBadge status={c.priority} kind="priority" />
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Workflow stepper */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ClipboardList className="h-4 w-4 text-teal-600" />
          Workflow
        </h2>
        <ol className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {WORKFLOW_STEPS.map((step, index) => {
            const done = index < currentStageIndex;
            const active = index === currentStageIndex;
            return (
              <li
                key={step.stage}
                className="flex flex-1 items-center gap-3"
              >
                <div
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium',
                    done
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : active
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-400',
                  ].join(' ')}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    'text-sm',
                    active
                      ? 'font-semibold text-teal-700'
                      : done
                        ? 'text-slate-600'
                        : 'text-slate-400',
                  ].join(' ')}
                >
                  {step.label}
                </span>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <span className="hidden flex-1 border-t border-dashed border-slate-200 sm:block" />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Action buttons */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Send className="h-4 w-4 text-teal-600" />
          Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isInactive || actionPending !== null}
            onClick={() =>
              runAction('send to operations', sendToOperations)
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            {actionPending === 'send to operations'
              ? 'Sending...'
              : 'Send to Operations'}
          </button>
          <button
            type="button"
            disabled={isInactive || actionPending !== null}
            onClick={() =>
              runAction('send to admin review', sendToAdminReview)
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            {actionPending === 'send to admin review'
              ? 'Sending...'
              : 'Send to Admin Review'}
          </button>
          <button
            type="button"
            disabled={isInactive || actionPending !== null}
            onClick={() => runAction('send to billing', sendToBilling)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            {actionPending === 'send to billing'
              ? 'Sending...'
              : 'Send to Billing'}
          </button>
          <button
            type="button"
            disabled={isInactive || actionPending !== null}
            onClick={() => runAction('close case', closeCase)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {actionPending === 'close case' ? 'Closing...' : 'Close Case'}
          </button>
          <button
            type="button"
            disabled={isInactive || actionPending !== null}
            onClick={() => setShowCancel((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Cancel / No-show
          </button>
          <button
            type="button"
            disabled={actionPending !== null}
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        {isCancelled && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            This case is <strong>cancelled</strong>
            {c.cancellation_reason ? ` — ${REASON_LABELS[c.cancellation_reason]}` : ''}.
          </div>
        )}

        {showCancel && !isInactive && (
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-rose-100 bg-rose-50/60 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Reason
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value as CancellationReasonValue)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              >
                <option value="no_show">No-show</option>
                <option value="patient_cancelled">Patient cancelled</option>
                <option value="client_cancelled">Client cancelled</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleCancel()}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        )}

        {showUpload && (
          <form
            onSubmit={handleUpload}
            className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Document Name
              </label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Discharge summary"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Document Type
              </label>
              <input
                type="text"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                placeholder="e.g. Medical Report"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-600">
                File
              </label>
              <input
                type="file"
                onChange={(e) =>
                  setDocFile(e.target.files?.[0] ?? null)
                }
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
              />
            </div>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Patient Info */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <User className="h-4 w-4 text-teal-600" />
            Patient Info
          </h2>
          {patient ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <InfoRow
                label="Name"
                value={`${patient.first_name ?? ''} ${patient.surname ?? ''}`.trim()}
              />
              <InfoRow label="ID Number" value={patient.id_number} />
              <InfoRow
                label="MMA File #"
                value={patient.mma_file_number}
              />
              <InfoRow label="Phone" value={patient.phone} />
              <InfoRow label="Email" value={patient.email} />
              <InfoRow
                label="Date of Birth"
                value={formatDate(patient.date_of_birth)}
              />
              <InfoRow label="Gender" value={patient.gender} />
              <InfoRow label="Area" value={patient.area} />
              <InfoRow
                label="Treating Doctor"
                value={patient.treating_doctor}
              />
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/patients/${patient.id}`)
                  }
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  View full profile &rarr;
                </button>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">
              No patient linked to this case.
            </p>
          )}
        </section>

        {/* Case Info */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ClipboardList className="h-4 w-4 text-teal-600" />
            Case Info
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <InfoRow label="Case Number" value={c.case_number} />
            <InfoRow label="File Number" value={c.file_number} />
            <InfoRow label="Type" value={c.case_type} />
            <InfoRow label="Treating Doctor" value={c.treating_doctor} />
            <InfoRow label="Status" value={c.case_status} />
            <InfoRow label="Priority" value={c.priority} />
            <InfoRow
              label="Workflow Stage"
              value={c.workflow_stage}
            />
            <InfoRow
              label="Department"
              value={c.assigned_department}
            />
            <InfoRow
              label="Date Opened"
              value={formatDate(c.date_opened)}
            />
            <InfoRow
              label="Due Date"
              value={formatDate(c.due_date)}
            />
          </dl>
          {c.notes && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Notes
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                {c.notes}
              </dd>
            </div>
          )}
        </section>
      </div>

      {/* Related Detail records */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText className="h-4 w-4 text-teal-600" />
          {c.case_type === 'inpatient' && 'Inpatient Details'}
          {c.case_type === 'outpatient' && 'Outpatient Details'}
          {c.case_type === 'laboratory' && 'Laboratory Details'}
        </h2>
        {detail ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(detail)
              .filter(
                ([key]) =>
                  ![
                    'id',
                    'case_id',
                    'created_at',
                    'updated_at',
                  ].includes(key),
              )
              .map(([key, value]) => (
                <InfoRow
                  key={key}
                  label={prettyLabel(key)}
                  value={renderValue(value)}
                />
              ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-400">
            No detail record available for this case.
          </p>
        )}
      </section>

      {/* Related Documents */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText className="h-4 w-4 text-teal-600" />
          Related Documents
        </h2>
        {documents.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {doc.document_type ?? 'Document'} ·{' '}
                      {formatDate(doc.upload_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={doc.document_status}
                    kind="document"
                  />
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                      View
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            No documents uploaded yet.
          </p>
        )}
      </section>

      {/* Audit Trail */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <History className="h-4 w-4 text-teal-600" />
          Audit Trail
        </h2>
        {auditLogs.length > 0 ? (
          <ol className="space-y-4">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex gap-3">
                <div className="mt-1 flex h-2 w-2 flex-shrink-0 rounded-full bg-teal-500" />
                <div>
                  <p className="text-sm text-slate-700">
                    {log.description ?? log.action}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(log.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">
            No audit entries recorded for this case.
          </p>
        )}
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm capitalize text-slate-700">
        {value && value.trim() !== '' ? value : '-'}
      </dd>
    </div>
  );
}
