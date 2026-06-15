import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  FileText,
  FolderOpen,
  Mail,
  MapPin,
  Phone,
  Save,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import type { Document, MedicalCase, Patient } from '../types';
import {
  getPatient,
  getPatientCases,
  getPatientDocuments,
  updatePatient,
} from '../api/patients';
import StatusBadge from '../components/StatusBadge';

type Tab = 'cases' | 'documents';

type EditableFields = Pick<
  Patient,
  | 'first_name'
  | 'surname'
  | 'phone'
  | 'email'
  | 'area'
  | 'treating_doctor'
  | 'address'
  | 'emergency_contact'
  | 'medical_aid_number'
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toEditable(p: Patient): EditableFields {
  return {
    first_name: p.first_name,
    surname: p.surname,
    phone: p.phone,
    email: p.email ?? '',
    area: p.area,
    treating_doctor: p.treating_doctor,
    address: p.address ?? '',
    emergency_contact: p.emergency_contact ?? '',
    medical_aid_number: p.medical_aid_number ?? '',
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [cases, setCases] = useState<MedicalCase[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('cases');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const numericId = Number(id);

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, c, d] = await Promise.all([
          getPatient(numericId),
          getPatientCases(numericId),
          getPatientDocuments(numericId),
        ]);
        if (cancelled) return;
        setPatient(p);
        setCases(c.data);
        setDocuments(d.data);
      } catch (err) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load patient profile.';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const fullName = useMemo(
    () => (patient ? `${patient.first_name} ${patient.surname}`.trim() : ''),
    [patient]
  );

  const beginEdit = () => {
    if (!patient) return;
    setDraft(toEditable(patient));
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setSaveError(null);
  };

  const updateDraft = (field: keyof EditableFields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!patient || !draft) return;

    if (!draft.first_name.trim() || !draft.surname.trim()) {
      setSaveError('First name and surname are required.');
      return;
    }
    if (!draft.phone.trim()) {
      setSaveError('Phone number is required.');
      return;
    }
    if (draft.email && draft.email.trim() && !EMAIL_RE.test(draft.email.trim())) {
      setSaveError('Enter a valid email address.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const payload: Partial<Patient> = {
        first_name: draft.first_name.trim(),
        surname: draft.surname.trim(),
        phone: draft.phone.trim(),
        email: draft.email?.trim() || null,
        area: draft.area?.trim() || null,
        treating_doctor: draft.treating_doctor?.trim() || null,
        address: draft.address?.trim() || null,
        emergency_contact: draft.emergency_contact?.trim() || null,
        medical_aid_number: draft.medical_aid_number?.trim() || null,
      };
      const updated = await updatePatient(patient.id, payload);
      setPatient(updated);
      setEditing(false);
      setDraft(null);
    } catch (err) {
      const response = (err as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      })?.response;
      const firstFieldError =
        response?.data?.errors && Object.values(response.data.errors)[0]?.[0];
      setSaveError(
        firstFieldError || response?.data?.message || 'Failed to save changes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Loading patient...
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 text-sm text-teal-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patients
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Patient not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 text-sm text-teal-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patients
        </Link>
        {!editing && (
          <button
            type="button"
            onClick={beginEdit}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Edit3 className="h-4 w-4" />
            Edit Patient
          </button>
        )}
      </div>

      {/* Patient info card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {!editing ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-800">{fullName}</h1>
                  <p className="text-sm text-slate-500">
                    File #{patient.mma_file_number} · ID {patient.id_number}
                  </p>
                </div>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={patient.phone} />
              <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email ?? '—'} />
              <InfoItem label="Date of Birth" value={formatDate(patient.date_of_birth)} />
              <InfoItem label="Gender" value={patient.gender} className="capitalize" />
              <InfoItem icon={<MapPin className="h-4 w-4" />} label="Area" value={patient.area ?? '—'} />
              <InfoItem
                icon={<Stethoscope className="h-4 w-4" />}
                label="Treating Doctor"
                value={patient.treating_doctor ?? '—'}
              />
              <InfoItem label="Registered" value={formatDate(patient.date_registered)} />
              <InfoItem label="Medical Aid #" value={patient.medical_aid_number ?? '—'} />
              <InfoItem
                label="Emergency Contact"
                value={patient.emergency_contact ?? '—'}
              />
              <InfoItem
                label="Address"
                value={patient.address ?? '—'}
                className="sm:col-span-2 lg:col-span-3"
              />
            </dl>
          </>
        ) : (
          <form onSubmit={handleSave} noValidate className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-800">Edit Patient</h2>
            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {saveError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditField label="First Name" required>
                <input
                  type="text"
                  value={draft?.first_name ?? ''}
                  onChange={updateDraft('first_name')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Surname" required>
                <input
                  type="text"
                  value={draft?.surname ?? ''}
                  onChange={updateDraft('surname')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Phone" required>
                <input
                  type="tel"
                  value={draft?.phone ?? ''}
                  onChange={updateDraft('phone')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Email">
                <input
                  type="email"
                  value={draft?.email ?? ''}
                  onChange={updateDraft('email')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Area">
                <input
                  type="text"
                  value={draft?.area ?? ''}
                  onChange={updateDraft('area')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Treating Doctor">
                <input
                  type="text"
                  value={draft?.treating_doctor ?? ''}
                  onChange={updateDraft('treating_doctor')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Emergency Contact">
                <input
                  type="text"
                  value={draft?.emergency_contact ?? ''}
                  onChange={updateDraft('emergency_contact')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Medical Aid Number">
                <input
                  type="text"
                  value={draft?.medical_aid_number ?? ''}
                  onChange={updateDraft('medical_aid_number')}
                  className={editInputClass}
                />
              </EditField>
              <EditField label="Address" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={draft?.address ?? ''}
                  onChange={updateDraft('address')}
                  className={editInputClass}
                />
              </EditField>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-200">
          <TabButton
            active={activeTab === 'cases'}
            onClick={() => setActiveTab('cases')}
            icon={<FolderOpen className="h-4 w-4" />}
            label="Cases"
            count={cases.length}
          />
          <TabButton
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
            icon={<FileText className="h-4 w-4" />}
            label="Documents"
            count={documents.length}
          />
        </div>

        <div className="p-4">
          {activeTab === 'cases' ? (
            cases.length === 0 ? (
              <EmptyState message="No cases recorded for this patient." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Case #</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 font-medium text-teal-700">
                          {c.case_number}
                        </td>
                        <td className="px-3 py-2 capitalize text-slate-700">
                          {c.case_type}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={c.case_status} />
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={c.priority} />
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {formatDate(c.date_opened)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : documents.length === 0 ? (
            <EmptyState message="No documents uploaded for this patient." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Uploaded</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((d) => (
                    <tr key={d.id} className="transition hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{d.name}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {d.document_type ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={d.document_status} />
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatDate(d.upload_date)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {d.file_url && (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-teal-600 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const editInputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200';

function InfoItem({
  icon,
  label,
  value,
  className = '',
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className={`mt-1 text-sm text-slate-800 ${className.includes('capitalize') ? 'capitalize' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function EditField({
  label,
  required,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition ${
        active
          ? 'border-b-2 border-teal-600 text-teal-700'
          : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-sm text-slate-500">{message}</div>
  );
}
