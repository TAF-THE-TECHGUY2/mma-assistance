import { api } from './client';
import { Notification, ListResponse, SingleResponse } from '../types';

export interface NotificationQuery {
  read?: boolean;
  page?: number;
  per_page?: number;
  [key: string]: unknown;
}

export async function getNotifications(
  params: NotificationQuery = {},
): Promise<ListResponse<Notification>> {
  const { data } = await api.get<ListResponse<Notification>>(
    '/notifications',
    { params },
  );
  return data;
}

export async function markNotificationRead(
  id: number | string,
): Promise<Notification> {
  const { data } = await api.put<SingleResponse<Notification>>(
    `/notifications/${id}`,
    { read: true },
  );
  return data.data;
}
