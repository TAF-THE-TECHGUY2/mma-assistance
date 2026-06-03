import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import {
  createCase,
  updateInpatientDetail,
  updateOutpatientDetail,
  updateLaboratoryDetail,
} from '../api/cases';
import { getPatients } from '../api/patients';
import type { Patient, CaseType, Priority } from '../types';

const CASE_TYPE_OPTIONS: { label: string; value: CaseType }[] = [
  { label: 'Inpatient', value: 'inpatient' },
  { label: 'Outpatient', value: 'outpatient' },
  { label: 'Laboratory', value: 'laboratory' },
];

const PRIORITY_OPTIONS: { label: string; value: Priority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
];

const DEPARTMENT_OPTIONS = [
  'Operations',
  'Admin',
  'Billing',
  'Laboratory',
  'Records',
];

export default function CreateCase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [patientId, setPatientId] = useState<string>(
    searchParams.get('patient_id') ?? '',
  );
  const [caseType, setCaseType] = useState<CaseType>('inpatient');
  const [priority, setPriority] = useState<Priority>('medium');
  const [department, setDepartment] = useState<string>('Operations');

  // Type-specific seed fields for the detail record.
  const [admissionDate, setAdmissionDate] = useState('');
  const [consultDate, setConsultDate] = useState('');
  const [ongoingTreatment, setOngoingTreatment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [labType, setLabType] = useState('');
  const [treatingDoctor, setTreatingDoctor] = useState('');
  const [area, setArea] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingPatients(true);
    getPatients()
      .then((res) => {
        if (active) setPatients(res.data);
      })
      .catch((err: any) => {
        if (active)
          setError(
            err?.response?.data?.message ?? 'Failed to load patients.',
          );
      })
      .finally(() => {
        if (active) setLoadingPatients(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientId) {
      setError('Please select a patient.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCase({
        patient_id: Number(patientId),
        case_type: caseType,
        priority,
        assigned_department: department || null,
      });

      // Seed the relevant detail record for the chosen case type.
      const caseId = created.id;
      if (caseType === 'inpatient') {
        await updateInpatientDetail(caseId, {
          admission_date: admissionDate || null,
        });
      } else if (caseType === 'outpatient') {
        await updateOutpatientDetail(caseId, {
          consult_date: consultDate || null,
          ongoing_treatment: ongoingTreatment,
        });
      } else if (caseType === 'laboratory') {
        await updateLaboratoryDetail(caseId, {
          appointment_date: appointmentDate || null,
          lab_type: labType || null,
          treating_doctor: treatingDoctor || null,
          area: area || null,
        });
      }

      navigate(`/cases/${caseId}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'Failed to create case.',
      );
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-600';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-xl font-semibold text-slate-800">New Case</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="patient">
              Patient
            </label>
            <select
              id="patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className={inputClass}
              disabled={loadingPatients}
              required
            >
              <option value="">
                {loadingPatients
                  ? 'Loading patients...'
                  : 'Select a patient'}
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.surname}
                  {p.mma_file_number ? ` (${p.mma_file_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="case_type">
              Case Type
            </label>
            <select
              id="case_type"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              className={inputClass}
            >
              {CASE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className={inputClass}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="department">
              Assigned Department
            </label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={inputClass}
            >
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Type-specific detail seed */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            {caseType === 'inpatient' && 'Inpatient Details'}
            {caseType === 'outpatient' && 'Outpatient Details'}
            {caseType === 'laboratory' && 'Laboratory Details'}
          </h2>

          {caseType === 'inpatient' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="admission_date">
                  Admission Date
                </label>
                <input
                  id="admission_date"
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {caseType === 'outpatient' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="consult_date">
                  Consult Date
                </label>
                <input
                  id="consult_date"
                  type="date"
                  value={consultDate}
                  onChange={(e) => setConsultDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={ongoingTreatment}
                    onChange={(e) =>
                      setOngoingTreatment(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Ongoing Treatment
                </label>
              </div>
            </div>
          )}

          {caseType === 'laboratory' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="appointment_date">
                  Appointment Date
                </label>
                <input
                  id="appointment_date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="lab_type">
                  Lab Type
                </label>
                <input
                  id="lab_type"
                  type="text"
                  value={labType}
                  onChange={(e) => setLabType(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Blood panel"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="treating_doctor">
                  Treating Doctor
                </label>
                <input
                  id="treating_doctor"
                  type="text"
                  value={treatingDoctor}
                  onChange={(e) => setTreatingDoctor(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="area">
                  Area
                </label>
                <input
                  id="area"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/cases')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitting ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      </form>
    </div>
  );
}
