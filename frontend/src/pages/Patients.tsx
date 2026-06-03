import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Users as UsersIcon } from 'lucide-react';
import type { Patient } from '../types';
import { getPatients } from '../api/patients';
import DataTable, { type Column } from '../components/DataTable';

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getPatients();
        if (!cancelled) setPatients(res.data);
      } catch (err) {
        if (!cancelled) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to load patients.';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = (p: Patient) => `${p.first_name} ${p.surname}`.trim();

  const columns = useMemo<Column<Patient>[]>(
    () => [
      {
        key: 'mma_file_number',
        header: 'MMA File #',
        sortable: true,
        accessor: (p) => p.mma_file_number,
        render: (p) => (
          <span className="font-medium text-teal-700">{p.mma_file_number}</span>
        ),
      },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        accessor: (p) => fullName(p),
        render: (p) => (
          <Link
            to={`/patients/${p.id}`}
            className="font-medium text-slate-800 hover:text-teal-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {fullName(p)}
          </Link>
        ),
      },
      {
        key: 'id_number',
        header: 'ID Number',
        sortable: true,
        accessor: (p) => p.id_number,
      },
      {
        key: 'phone',
        header: 'Phone',
        sortable: false,
        accessor: (p) => p.phone,
      },
      {
        key: 'area',
        header: 'Area',
        sortable: true,
        accessor: (p) => p.area,
      },
      {
        key: 'treating_doctor',
        header: 'Treating Doctor',
        sortable: true,
        accessor: (p) => p.treating_doctor,
      },
      {
        key: 'date_registered',
        header: 'Registered',
        sortable: true,
        accessor: (p) => p.date_registered,
        render: (p) =>
          p.date_registered ? new Date(p.date_registered).toLocaleDateString() : '—',
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Patients</h1>
            <p className="text-sm text-slate-500">
              Search, view, and manage registered patients.
            </p>
          </div>
        </div>
        <Link
          to="/patients/create"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <UserPlus className="h-4 w-4" />
          New Patient
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable<Patient>
          data={patients}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Search by name, file number, ID, area..."
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/patients/${p.id}`)}
          emptyMessage="No patients found. Click “New Patient” to register one."
        />
      </div>
    </div>
  );
}
