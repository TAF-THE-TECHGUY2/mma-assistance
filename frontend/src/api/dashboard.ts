import { api } from './client';
import { DashboardStats, SingleResponse } from '../types';

/**
 * GET /api/dashboard/stats — aggregate dashboard metrics.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<
    SingleResponse<DashboardStats> | DashboardStats
  >('/dashboard/stats');
  // Support both {data:{...}} and bare object shapes.
  return (data as SingleResponse<DashboardStats>).data ??
    (data as DashboardStats);
}
