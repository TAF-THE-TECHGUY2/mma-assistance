import { api } from './client';
import {
  Patient,
  MedicalCase,
  Document,
  ListResponse,
  SingleResponse,
} from '../types';

export interface PatientQuery {
  search?: string;
  area?: string;
  treating_doctor?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

export type PatientPayload = Omit<
  Patient,
  'id' | 'created_at' | 'updated_at'
>;

export async function getPatients(
  params: PatientQuery = {},
): Promise<ListResponse<Patient>> {
  const { data } = await api.get<ListResponse<Patient>>('/patients', {
    params,
  });
  return data;
}

export async function getPatient(id: number | string): Promise<Patient> {
  const { data } = await api.get<SingleResponse<Patient>>(`/patients/${id}`);
  return data.data;
}

export async function createPatient(
  payload: Partial<PatientPayload>,
  options: { force?: boolean } = {},
): Promise<Patient> {
  const body = options.force ? { ...payload, force: true } : payload;
  const { data } = await api.post<SingleResponse<Patient>>('/patients', body);
  return data.data;
}

export async function updatePatient(
  id: number | string,
  payload: Partial<PatientPayload>,
): Promise<Patient> {
  const { data } = await api.put<SingleResponse<Patient>>(
    `/patients/${id}`,
    payload,
  );
  return data.data;
}

export async function deletePatient(id: number | string): Promise<void> {
  await api.delete(`/patients/${id}`);
}

export async function getPatientCases(
  id: number | string,
): Promise<ListResponse<MedicalCase>> {
  const { data } = await api.get<ListResponse<MedicalCase>>(
    `/patients/${id}/cases`,
  );
  return data;
}

export async function getPatientDocuments(
  id: number | string,
): Promise<ListResponse<Document>> {
  const { data } = await api.get<ListResponse<Document>>(
    `/patients/${id}/documents`,
  );
  return data;
}
