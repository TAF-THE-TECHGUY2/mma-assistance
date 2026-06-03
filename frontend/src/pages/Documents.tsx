import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Document, DocumentStatus } from '../types';
import { getDocuments, createDocument, deleteDocument } from '../api/documents';

const STATUS_OPTIONS: DocumentStatus[] = ['pending', 'approved', 'rejected'];

const STATUS_STYLES: Record<DocumentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
};

function statusBadge(status?: DocumentStatus | null) {
  const safe = (status ?? 'pending') as DocumentStatus;
  const cls = STATUS_STYLES[safe] ?? 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {safe}
    </span>
  );
}

function normalise(raw: unknown): Document[] {
  if (Array.isArray(raw)) return raw as Document[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Document[];
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

interface UploadForm {
  name: string;
  file_url: string;
  document_type: string;
  document_category: string;
  document_status: DocumentStatus;
  upload_date: string;
  patient_id: string;
  case_id: string;
}

const EMPTY_FORM: UploadForm = {
  name: '',
  file_url: '',
  document_type: '',
  document_category: '',
  document_status: 'pending',
  upload_date: todayInput(),
  patient_id: '',
  case_id: '',
};

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | DocumentStatus>('');

  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getDocuments();
      setDocuments(normalise(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(documents.map((d) => d.document_category).filter((v): v is string => !!v)),
      ).sort(),
    [documents],
  );

  const types = useMemo(
    () =>
      Array.from(
        new Set(documents.map((d) => d.document_type).filter((v): v is string => !!v)),
      ).sort(),
    [documents],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (filterCategory && d.document_category !== filterCategory) return false;
      if (filterType && d.document_type !== filterType) return false;
      if (filterStatus && (d.document_status ?? 'pending') !== filterStatus) return false;
      if (term) {
        const name = d.name?.toLowerCase() ?? '';
        const cat = d.document_category?.toLowerCase() ?? '';
        const type = d.document_type?.toLowerCase() ?? '';
        if (!name.includes(term) && !cat.includes(term) && !type.includes(term)) return false;
      }
      return true;
    });
  }, [documents, search, filterCategory, filterType, filterStatus]);

  function openUpload() {
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowUpload(true);
  }

  function closeUpload() {
    setShowUpload(false);
    setSaveError(null);
  }

  async function handleUpload() {
    if (!form.name.trim() || !form.file_url.trim()) {
      setSaveError('Name and file URL are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await createDocument({
        name: form.name.trim(),
        file_url: form.file_url.trim(),
        document_type: form.document_type || null,
        document_category: form.document_category || null,
        document_status: form.document_status,
        upload_date: form.upload_date || todayInput(),
        patient_id: form.patient_id ? Number(form.patient_id) : null,
        case_id: form.case_id ? Number(form.case_id) : null,
      });
      closeUpload();
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  }

  function resetFilters() {
    setSearch('');
    setFilterCategory('');
    setFilterType('');
    setFilterStatus('');
  }

  const hasFilters = !!(search || filterCategory || filterType || filterStatus);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Documents</h1>
            <p className="text-sm text-slate-500">
              Upload, browse, and manage patient and case documents.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All Types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as '' | DocumentStatus)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
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
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Linked To</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Status</th>
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
                    No documents found.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-medium text-slate-800">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{doc.document_category || '—'}</td>
                    <td className="px-4 py-3">{doc.document_type || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {doc.patient_id ? (
                          <Link
                            to={`/patients/${doc.patient_id}`}
                            className="text-xs font-medium text-teal-600 hover:underline"
                          >
                            Patient #{doc.patient_id}
                          </Link>
                        ) : null}
                        {doc.case_id ? (
                          <Link
                            to={`/cases/${doc.case_id}`}
                            className="text-xs font-medium text-sky-600 hover:underline"
                          >
                            Case #{doc.case_id}
                          </Link>
                        ) : null}
                        {!doc.patient_id && !doc.case_id ? (
                          <span className="text-xs text-slate-400">Unlinked</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{fmtDate(doc.upload_date)}</td>
                    <td className="px-4 py-3">{statusBadge(doc.document_status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {doc.file_url && (
                          <>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Preview"
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                            <a
                              href={doc.file_url}
                              download
                              title="Download"
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-sky-600"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          title="Delete"
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-semibold text-slate-800">Upload Document</h2>
              </div>
              <button
                type="button"
                onClick={closeUpload}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Discharge Summary"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  File URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.file_url}
                  onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                  <input
                    type="text"
                    value={form.document_category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, document_category: e.target.value }))
                    }
                    placeholder="e.g. Clinical"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                  <input
                    type="text"
                    value={form.document_type}
                    onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}
                    placeholder="e.g. PDF / Report"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                  <select
                    value={form.document_status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        document_status: e.target.value as DocumentStatus,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Upload Date
                  </label>
                  <input
                    type="date"
                    value={form.upload_date}
                    onChange={(e) => setForm((f) => ({ ...f, upload_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Patient ID
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.patient_id}
                    onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Case ID</label>
                  <input
                    type="number"
                    min={1}
                    value={form.case_id}
                    onChange={(e) => setForm((f) => ({ ...f, case_id: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
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
                onClick={closeUpload}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
