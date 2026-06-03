import { api } from './client';
import {
  Billing,
  BillingStatus,
  ListResponse,
  SingleResponse,
} from '../types';

export interface BillingQuery {
  search?: string;
  billing_status?: BillingStatus;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface BillingPayload {
  billing_status?: BillingStatus;
  submission_date?: string | null;
  date_pastel?: string | null;
  notes?: string | null;
}

/**
 * GET /api/billing returns pending + submitted + history.
 */
export async function getBilling(
  params: BillingQuery = {},
): Promise<ListResponse<Billing>> {
  const { data } = await api.get<ListResponse<Billing>>('/billing', {
    params,
  });
  return data;
}

/**
 * PUT /api/billing/{caseId} updates the billing record for a case.
 */
export async function updateBilling(
  caseId: number | string,
  payload: Partial<BillingPayload>,
): Promise<Billing> {
  const { data } = await api.put<SingleResponse<Billing>>(
    `/billing/${caseId}`,
    payload,
  );
  return data.data;
}
