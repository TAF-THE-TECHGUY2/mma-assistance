import { api } from './client';
import {
  AdminReview,
  MedicalCase,
  ListResponse,
  SingleResponse,
} from '../types';

export type AdminReviewAction = 'approve' | 'return' | 'close';

export interface AdminReviewQuery {
  search?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface AdminReviewPayload {
  action: AdminReviewAction;
  review_notes?: string | null;
  admin_closure_date?: string | null;
}

/**
 * GET /api/admin-review returns cases pending admin review.
 */
export async function getAdminReviews(
  params: AdminReviewQuery = {},
): Promise<ListResponse<MedicalCase>> {
  const { data } = await api.get<ListResponse<MedicalCase>>('/admin-review', {
    params,
  });
  return data;
}

/**
 * POST /api/admin-review/{caseId} performs approve | return | close.
 */
export async function submitAdminReview(
  caseId: number | string,
  payload: AdminReviewPayload,
): Promise<AdminReview> {
  const { data } = await api.post<SingleResponse<AdminReview>>(
    `/admin-review/${caseId}`,
    payload,
  );
  return data.data;
}
