import { api } from './client';
import { NotificationSettings } from '../types';

/** GET /api/settings — current notification recipient settings. */
export async function getSettings(): Promise<NotificationSettings> {
  const { data } = await api.get<{ data: NotificationSettings }>('/settings');
  return data.data;
}

/** PUT /api/settings — update recipient emails + event toggles (admin/owner). */
export async function updateSettings(
  payload: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const { data } = await api.put<{ data: NotificationSettings }>(
    '/settings',
    payload,
  );
  return data.data;
}
