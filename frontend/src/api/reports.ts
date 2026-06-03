import { api } from './client';

export interface ReportQuery {
  from?: string;
  to?: string;
  case_type?: string;
  workflow_stage?: string;
  area?: string;
  [key: string]: unknown;
}

export interface ReportResponse<T = Record<string, unknown>> {
  data: T[];
  meta?: Record<string, unknown>;
}

/**
 * GET /api/reports/{report} — generic typed report fetch.
 * Pass the report slug (e.g. "cases-by-status", "billing-summary").
 */
export async function getReport<T = Record<string, unknown>>(
  report: string,
  params: ReportQuery = {},
): Promise<ReportResponse<T>> {
  const { data } = await api.get<ReportResponse<T>>(`/reports/${report}`, {
    params,
  });
  return data;
}
