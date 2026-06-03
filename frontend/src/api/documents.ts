import { api } from './client';
import {
  Document,
  DocumentStatus,
  ListResponse,
  SingleResponse,
} from '../types';

export interface DocumentQuery {
  search?: string;
  patient_id?: number;
  case_id?: number;
  document_status?: DocumentStatus;
  document_type?: string;
  document_category?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface DocumentPayload {
  name: string;
  patient_id?: number | null;
  case_id?: number | null;
  upload_date?: string;
  document_type?: string | null;
  file_url: string;
  document_status?: DocumentStatus;
  document_category?: string | null;
}

export async function getDocuments(
  params: DocumentQuery = {},
): Promise<ListResponse<Document>> {
  const { data } = await api.get<ListResponse<Document>>('/documents', {
    params,
  });
  return data;
}

export async function getDocument(id: number | string): Promise<Document> {
  const { data } = await api.get<SingleResponse<Document>>(`/documents/${id}`);
  return data.data;
}

export async function createDocument(
  payload: Partial<DocumentPayload> | FormData,
): Promise<Document> {
  const isFormData =
    typeof FormData !== 'undefined' && payload instanceof FormData;
  const { data } = await api.post<SingleResponse<Document>>(
    '/documents',
    payload,
    isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined,
  );
  return data.data;
}

export async function deleteDocument(id: number | string): Promise<void> {
  await api.delete(`/documents/${id}`);
}
