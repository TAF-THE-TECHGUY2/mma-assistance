import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import type { Patient } from '../types';
import { createPatient } from '../api/patients';

type PatientFormState = {
  first_name: string;
  surname: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  id_number: string;
  mma_file_number: string;
  area: string;
  treating_doctor: string;
  date_registered: string;
  address: string;
  emergency_contact: string;
  medical_aid_number: string;
};

type FormErrors = Partial<Record<keyof PatientFormState, string>>;

const today = new Date().toISOString().slice(0, 10);

const initialState: PatientFormState = {
  first_name: '',
  surname: '',
  date_of_birth: '',
  gender: '',
  phone: '',
  email: '',
  id_number: '',
  mma_file_number: '',
  area: '',
  treating_doctor: '',
  date_registered: today,
  address: '',
  emergency_contact: '',
  medical_aid_number: '',
};

// South African ID number: 13 digits.
const ID_NUMBER_RE = /^\d{13}$/;
// MMA file number: alphanumeric with optional dashes/slashes, 3-20 chars.
const MMA_FILE_RE = /^[A-Za-z0-9/-]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: PatientFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.first_name.trim()) errors.first_name = 'First name is required.';
  if (!form.surname.trim()) errors.surname = 'Surname is required.';
  if (!form.date_of_birth) errors.date_of_birth = 'Date of birth is required.';
  else if (form.date_of_birth > today)
    errors.date_of_birth = 'Date of birth cannot be in the future.';
  if (!form.gender) errors.gender = 'Gender is required.';
  if (!form.phone.trim()) errors.phone = 'Phone number is required.';

  if (!form.id_number.trim()) {
    errors.id_number = 'ID number is required.';
  } else if (!ID_NUMBER_RE.test(form.id_number.trim())) {
    errors.id_number = 'ID number must be exactly 13 digits.';
  }

  if (!form.mma_file_number.trim()) {
    errors.mma_file_number = 'MMA file number is required.';
  } else if (!MMA_FILE_RE.test(form.mma_file_number.trim())) {
    errors.mma_file_number =
      'File number must be 3-20 alphanumeric characters (dashes/slashes allowed).';
  }

  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.area.trim()) errors.area = 'Area is required.';
  if (!form.treating_doctor.trim())
    errors.treating_doctor = 'Treating doctor is required.';
  if (!form.date_registered) errors.date_registered = 'Registration date is required.';

  return errors;
}

/**
 * Maps a Laravel 422 validation error response onto our field-level errors so
 * duplicate id_number / mma_file_number (and any other server validation) are
 * shown inline next to the offending field.
 */
function mapServerErrors(err: unknown): { fieldErrors: FormErrors; message: string } {
  const response = (err as {
    response?: {
      status?: number;
      data?: { message?: string; errors?: Record<string, string[]> };
    };
  })?.response;

  const fieldErrors: FormErrors = {};
  let message = response?.data?.message || 'Failed to create patient. Please try again.';

  const serverErrors = response?.data?.errors;
  if (serverErrors) {
    (Object.keys(serverErrors) as (keyof PatientFormState)[]).forEach((key) => {
      const msgs = serverErrors[key as string];
      if (Array.isArray(msgs) && msgs.length > 0) {
        fieldErrors[key] = msgs[0];
      }
    });
    if (Object.keys(fieldErrors).length > 0) {
      message = 'Please fix the highlighted fields and try again.';
    }
  }

  return { fieldErrors, message };
}

export default function CreatePatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PatientFormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof PatientFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFormError('Please correct the errors below before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Patient> = {
        first_name: form.first_name.trim(),
        surname: form.surname.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        id_number: form.id_number.trim(),
        mma_file_number: form.mma_file_number.trim(),
        area: form.area.trim(),
        treating_doctor: form.treating_doctor.trim(),
        date_registered: form.date_registered,
        address: form.address.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        medical_aid_number: form.medical_aid_number.trim() || null,
      };

      const created = await createPatient(payload);
      navigate(`/patients/${created.id}`);
    } catch (err) {
      const { fieldErrors, message } = mapServerErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof PatientFormState) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:outline-none focus:ring-2 ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
        : 'border-slate-300 focus:border-teal-400 focus:ring-teal-200'
    }`;

  const FieldError = ({ field }: { field: keyof PatientFormState }) =>
    errors[field] ? (
      <p className="mt-1 text-xs text-red-600">{errors[field]}</p>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/patients"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="Back to patients"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">New Patient</h1>
            <p className="text-sm text-slate-500">
              Register a new patient in the system.
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Personal Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={update('first_name')}
                className={inputClass('first_name')}
                placeholder="Jane"
              />
              <FieldError field="first_name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Surname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.surname}
                onChange={update('surname')}
                className={inputClass('surname')}
                placeholder="Doe"
              />
              <FieldError field="surname" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                max={today}
                value={form.date_of_birth}
                onChange={update('date_of_birth')}
                className={inputClass('date_of_birth')}
              />
              <FieldError field="date_of_birth" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={form.gender}
                onChange={update('gender')}
                className={inputClass('gender')}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <FieldError field="gender" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ID Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.id_number}
                onChange={update('id_number')}
                className={inputClass('id_number')}
                placeholder="13-digit ID number"
                maxLength={13}
              />
              <FieldError field="id_number" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                MMA File Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.mma_file_number}
                onChange={update('mma_file_number')}
                className={inputClass('mma_file_number')}
                placeholder="MMA-0001"
              />
              <FieldError field="mma_file_number" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                className={inputClass('phone')}
                placeholder="+27 ..."
              />
              <FieldError field="phone" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                className={inputClass('email')}
                placeholder="patient@example.com"
              />
              <FieldError field="email" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={update('address')}
                rows={2}
                className={inputClass('address')}
                placeholder="Street, suburb, city"
              />
              <FieldError field="address" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Emergency Contact
              </label>
              <input
                type="text"
                value={form.emergency_contact}
                onChange={update('emergency_contact')}
                className={inputClass('emergency_contact')}
                placeholder="Name & phone"
              />
              <FieldError field="emergency_contact" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Medical Aid Number
              </label>
              <input
                type="text"
                value={form.medical_aid_number}
                onChange={update('medical_aid_number')}
                className={inputClass('medical_aid_number')}
                placeholder="Optional"
              />
              <FieldError field="medical_aid_number" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Medical &amp; Registration
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.area}
                onChange={update('area')}
                className={inputClass('area')}
                placeholder="Region / area"
              />
              <FieldError field="area" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Treating Doctor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.treating_doctor}
                onChange={update('treating_doctor')}
                className={inputClass('treating_doctor')}
                placeholder="Dr. ..."
              />
              <FieldError field="treating_doctor" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date Registered <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                max={today}
                value={form.date_registered}
                onChange={update('date_registered')}
                className={inputClass('date_registered')}
              />
              <FieldError field="date_registered" />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link
            to="/patients"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitting ? 'Saving...' : 'Save Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
