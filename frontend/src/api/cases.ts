import { api } from './client';
import {
  MedicalCase,
  InpatientDetail,
  OutpatientDetail,
  LaboratoryDetail,
  CaseType,
  CaseStatus,
  WorkflowStage,
  Priority,
  ListResponse,
  SingleResponse,
} from '../types';

export interface CaseQuery {
  search?: string;
  case_type?: CaseType;
  case_status?: CaseStatus;
  workflow_stage?: WorkflowStage;
  priority?: Priority;
  patient_id?: number;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface CasePayload {
  patient_id: number;
  case_type: CaseType;
  case_status?: CaseStatus;
  workflow_stage?: WorkflowStage;
  priority?: Priority;
  assigned_department?: string | null;
  date_opened?: string;
}

export async function getCases(
  params: CaseQuery = {},
): Promise<ListResponse<MedicalCase>> {
  const { data } = await api.get<ListResponse<MedicalCase>>('/cases', {
    params,
  });
  return data;
}

export async function getCase(id: number | string): Promise<MedicalCase> {
  const { data } = await api.get<SingleResponse<MedicalCase>>(`/cases/${id}`);
  return data.data;
}

export async function createCase(
  payload: Partial<CasePayload>,
): Promise<MedicalCase> {
  const { data } = await api.post<SingleResponse<MedicalCase>>(
    '/cases',
    payload,
  );
  return data.data;
}

export async function updateCase(
  id: number | string,
  payload: Partial<CasePayload>,
): Promise<MedicalCase> {
  const { data } = await api.put<SingleResponse<MedicalCase>>(
    `/cases/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteCase(id: number | string): Promise<void> {
  await api.delete(`/cases/${id}`);
}

// ===== Workflow transitions =====

export async function sendToOperations(
  id: number | string,
): Promise<MedicalCase> {
  const { data } = await api.post<SingleResponse<MedicalCase>>(
    `/cases/${id}/send-to-operations`,
  );
  return data.data;
}

export async function sendToAdminReview(
  id: number | string,
): Promise<MedicalCase> {
  const { data } = await api.post<SingleResponse<MedicalCase>>(
    `/cases/${id}/send-to-admin-review`,
  );
  return data.data;
}

export async function sendToBilling(
  id: number | string,
): Promise<MedicalCase> {
  const { data } = await api.post<SingleResponse<MedicalCase>>(
    `/cases/${id}/send-to-billing`,
  );
  return data.data;
}

export async function closeCase(id: number | string): Promise<MedicalCase> {
  const { data } = await api.post<SingleResponse<MedicalCase>>(
    `/cases/${id}/close`,
  );
  return data.data;
}

// ===== Case-type detail sub-resources =====

export async function getInpatientDetail(
  id: number | string,
): Promise<InpatientDetail> {
  const { data } = await api.get<SingleResponse<InpatientDetail>>(
    `/cases/${id}/inpatient`,
  );
  return data.data;
}

export async function updateInpatientDetail(
  id: number | string,
  payload: Partial<InpatientDetail>,
): Promise<InpatientDetail> {
  const { data } = await api.put<SingleResponse<InpatientDetail>>(
    `/cases/${id}/inpatient`,
    payload,
  );
  return data.data;
}

export async function getOutpatientDetail(
  id: number | string,
): Promise<OutpatientDetail> {
  const { data } = await api.get<SingleResponse<OutpatientDetail>>(
    `/cases/${id}/outpatient`,
  );
  return data.data;
}

export async function updateOutpatientDetail(
  id: number | string,
  payload: Partial<OutpatientDetail>,
): Promise<OutpatientDetail> {
  const { data } = await api.put<SingleResponse<OutpatientDetail>>(
    `/cases/${id}/outpatient`,
    payload,
  );
  return data.data;
}

export async function getLaboratoryDetail(
  id: number | string,
): Promise<LaboratoryDetail> {
  const { data } = await api.get<SingleResponse<LaboratoryDetail>>(
    `/cases/${id}/laboratory`,
  );
  return data.data;
}

export async function updateLaboratoryDetail(
  id: number | string,
  payload: Partial<LaboratoryDetail>,
): Promise<LaboratoryDetail> {
  const { data } = await api.put<SingleResponse<LaboratoryDetail>>(
    `/cases/${id}/laboratory`,
    payload,
  );
  return data.data;
}
