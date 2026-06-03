import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Loader2,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import type { Billing, BillingStatus } from '../types';
import { getBilling, updateBilling } from '../api/billing';

type TabKey = 'pending' | 'submitted' | 'history';

interface BillingBuckets {
  pending: Billing[];
  submitted: Billing[];
  history: Billing[];
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending Billing' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'history', label: 'Billing History' },
];

const BILLING_STATUS_OPTIONS: BillingStatus[] = ['pending', 'submitted', 'completed'];

const STATUS_STYLES: Record<BillingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  submitted: 'bg-sky-100 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

function statusBadge(status?: BillingStatus | null) {
  const safe = (status ?? 'pending') as BillingStatus;
  const cls = STATUS_STYLES[safe] ?? 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {safe}
    </span>
  );
}

function bucketize(rows: Billing[]): BillingBuckets {
  const buckets: BillingBuckets = { pending: [], submitted: [], history: [] };
  for (const row of rows) {
    const status = (row.billing_status ?? 'pending') as BillingStatus;
    if (status === 'completed') {
      buckets.history.push(row);
    } else if (status === 'submitted') {
      buckets.submitted.push(row);
    } else {
      buckets.pending.push(row);
    }
  }
  return buckets;
}

/**
 * Normalises the billing API response into the three buckets used by the tabs.
 * Supports either a pre-bucketed payload ({pending, submitted, history}) or a
 * flat list ({data:[...]} / [...]) which we bucket client-side by status.
 */
function normalise(raw: unknown): BillingBuckets {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const hasBuckets =
      Array.isArray(obj.pending) || Array.isArray(obj.submitted) || Array.isArray(obj.history);
    if (hasBuckets) {
      return {
        pending: (obj.pending as Billing[]) ?? [],
        submitted: (obj.submitted as Billing[]) ?? [],
        history: (obj.history as Billing[]) ?? [],
      };
    }
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      return normalise(obj.data);
    }
    if (Array.isArray(obj.data)) {
      return bucketize(obj.data as Billing[]);
    }
  }
  if (Array.isArray(raw)) {
    return bucketize(raw as Billing[]);
  }
  return { pending: [], submitted: [], history: [] };
}

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

interface EditForm {
  billing_status: BillingStatus;
  submission_date: string;
  date_pastel: string;
  notes: string;
}

export default function Billing() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [buckets, setBuckets] = useState<BillingBuckets>({
    pending: [],
    submitted: [],
    history: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<Billing | null>(null);
  const [form, setForm] = useState<EditForm>({
    billing_status: 'pending',
    submission_date: '',
    date_pastel: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getBilling();
      setBuckets(normalise(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = buckets[activeTab];

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const caseNo = row.case?.case_number?.toLowerCase() ?? '';
      const notes = row.notes?.toLowerCase() ?? '';
      const status = (row.billing_status ?? '').toLowerCase();
      return (
        caseNo.includes(term) ||
        notes.includes(term) ||
        status.includes(term) ||
        String(row.case_id).includes(term)
      );
    });
  }, [rows, search]);

  function openEdit(row: Billing) {
    setEditing(row);
    setSaveError(null);
    setForm({
      billing_status: (row.billing_status ?? 'pending') as BillingStatus,
      submission_date: toDateInput(row.submission_date),
      date_pastel: toDateInput(row.date_pastel),
      notes: row.notes ?? '',
    });
  }

  function closeEdit() {
    setEditing(null);
    setSaveError(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateBilling(editing.case_id, {
        billing_status: form.billing_status,
        submission_date: form.submission_date || null,
        date_pastel: form.date_pastel || null,
        notes: form.notes || null,
      });
      closeEdit();
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save billing record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Billing</h1>
            <p className="text-sm text-slate-500">
              Track billing submissions through to completion.
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
          <nav className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((tab) => {
              const count = buckets[tab.key].length;
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 text-xs ${
                      active ? 'bg-teal-50 text-teal-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case number or notes…"
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submission Date</th>
                <th className="px-4 py-3">Date Pastel</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No records in this view.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {row.case?.case_number ?? `Case #${row.case_id}`}
                      </div>
                      {row.case?.case_type && (
                        <div className="text-xs capitalize text-slate-400">
                          {row.case.case_type}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(row.billing_status)}</td>
                    <td className="px-4 py-3">{fmtDate(row.submission_date)}</td>
                    <td className="px-4 py-3">{fmtDate(row.date_pastel)}</td>
                    <td className="px-4 py-3">
                      <span className="line-clamp-2 max-w-xs text-slate-500">
                        {row.notes || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Edit Billing</h2>
                <p className="text-xs text-slate-500">
                  {editing.case?.case_number ?? `Case #${editing.case_id}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Billing Status
                </label>
                <select
                  value={form.billing_status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billing_status: e.target.value as BillingStatus }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  {BILLING_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="capitalize">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Submission Date
                  </label>
                  <input
                    type="date"
                    value={form.submission_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, submission_date: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Date Pastel
                  </label>
                  <input
                    type="date"
                    value={form.date_pastel}
                    onChange={(e) => setForm((f) => ({ ...f, date_pastel: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add billing notes…"
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
