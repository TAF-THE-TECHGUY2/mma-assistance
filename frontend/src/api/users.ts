import { api } from './client';
import { User, Role, ListResponse, SingleResponse } from '../types';

export interface UserQuery {
  search?: string;
  role?: Role;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  role: Role;
}

export async function getUsers(
  params: UserQuery = {},
): Promise<ListResponse<User>> {
  const { data } = await api.get<ListResponse<User>>('/users', { params });
  return data;
}

export async function getUser(id: number | string): Promise<User> {
  const { data } = await api.get<SingleResponse<User>>(`/users/${id}`);
  return data.data;
}

export async function createUser(
  payload: Partial<UserPayload>,
): Promise<User> {
  const { data } = await api.post<SingleResponse<User>>('/users', payload);
  return data.data;
}

export async function updateUser(
  id: number | string,
  payload: Partial<UserPayload>,
): Promise<User> {
  const { data } = await api.put<SingleResponse<User>>(
    `/users/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteUser(id: number | string): Promise<void> {
  await api.delete(`/users/${id}`);
}
