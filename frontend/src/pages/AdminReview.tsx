import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Undo2,
  X,
} from 'lucide-react';
import type { CaseStatus, MedicalCase, Priority } from '../types';
import { getAdminReviews, submitAdminReview } from '../api/adminReview';

type ReviewAction = 'approve' | 'return' | 'close';

const ACTION_META: Record<
  ReviewAction,
  { label: string; description: string; classes: string; icon: typeof CheckCircle2 }
> = {
  approve: {
    label: 'Approve',
    description: 'Approve the case and advance it to billing.',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    icon: CheckCircle2,
  },
  return: {
    label: 'Return to Operations',
    description: 'Send the case back to operations for further work.',
    classes: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    icon: Undo2,
  },
  close: {
    label: 'Close Case',
    description: 'Close the case. This finalises the workflow.',
    classes: 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200',
    icon: Lock,
  },
};

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600 border border-slate-200',
  medium: 'bg-sky-100 text-sky-700 border border-sky-200',
  high: 'bg-orange-100 text-orange-700 border border-orange-200',
  urgent: 'bg-red-100 text-red-700 border border-red-200',
};

function priorityBadge(priority?: Priority | null) {
  const safe = (priority ?? 'medium') as Priority;
  const cls = PRIORITY_STYLES[safe] ?? 'bg-slate-100 text-slate-600 border border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {safe}
    </span>
  );
}

function caseStatusBadge(status?: CaseStatus | null) {
  const safe = (status ?? 'admin_review') as CaseStatus;
  return (
    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-700">
      {safe.replace(/_/g, ' ')}
    </span>
  );
}

function normalise(raw: unknown): MedicalCase[] {
  if (Array.isArray(raw)) return raw as MedicalCase[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as MedicalCase[];
  }
  return [];
}

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function patientName(c: MedicalCase): string {
  const p = c.patient;
  if (p && (p.first_name || p.surname)) {
    return [p.first_name, p.surname].filter(Boolean).join(' ');
  }
  return '—';
}

export default function AdminReview() {
  const [cases, setCases] = useState<MedicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [reviewing, setReviewing] = useState<MedicalCase | null>(null);
  const [action, setAction] = useState<ReviewAction>('approve');
  const [closureDate, setClosureDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getAdminReviews();
      setCases(normalise(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the review queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter((c) => {
      const caseNo = c.case_number?.toLowerCase() ?? '';
      const dept = c.assigned_department?.toLowerCase() ?? '';
      return (
        caseNo.includes(term) ||
        dept.includes(term) ||
        patientName(c).toLowerCase().includes(term)
      );
    });
  }, [cases, search]);

  function openReview(c: MedicalCase) {
    setReviewing(c);
    setAction('approve');
    setClosureDate(todayInput());
    setNotes('');
    setSubmitError(null);
  }

  function closeReview() {
    setReviewing(null);
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (!reviewing) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitAdminReview(reviewing.id, {
        action,
        admin_closure_date: action === 'close' ? closureDate || todayInput() : closureDate || null,
        review_notes: notes || null,
      });
      closeReview();
      await load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit the review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Admin Review</h1>
            <p className="text-sm text-slate-500">
              Cases awaiting administrative review and closure.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{filtered.length}</span> case
            {filtered.length === 1 ? '' : 's'} in queue
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case, patient, department…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No cases awaiting review.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {c.case_number ?? `Case #${c.id}`}
                    </td>
                    <td className="px-4 py-3">{patientName(c)}</td>
                    <td className="px-4 py-3 capitalize">{c.case_type ?? '—'}</td>
                    <td className="px-4 py-3">{priorityBadge(c.priority)}</td>
                    <td className="px-4 py-3">{caseStatusBadge(c.case_status)}</td>
                    <td className="px-4 py-3">{fmtDate(c.date_opened)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openReview(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Review Case</h2>
                <p className="text-xs text-slate-500">
                  {reviewing.case_number ?? `Case #${reviewing.id}`} · {patientName(reviewing)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReview}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <span className="mb-2 block text-xs font-medium text-slate-600">Decision</span>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(ACTION_META) as ReviewAction[]).map((key) => {
                    const meta = ACTION_META[key];
                    const Icon = meta.icon;
                    const selected = action === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAction(key)}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                          selected
                            ? meta.classes
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <span className="block text-sm font-medium">{meta.label}</span>
                          <span className="block text-xs opacity-80">{meta.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Admin Closure Date
                  {action === 'close' && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="date"
                  value={closureDate}
                  onChange={(e) => setClosureDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Review Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add review notes…"
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={closeReview}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                Submit {ACTION_META[action].label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
