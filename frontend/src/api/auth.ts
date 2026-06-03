import { api } from './client';
import { User } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/login', credentials);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/logout');
}

export async function me(): Promise<User> {
  const { data } = await api.get<{ data: User } | User>('/me');
  // Support both {data:{...}} and bare user shapes.
  return (data as { data?: User }).data ?? (data as User);
}

export interface MeUpdatePayload {
  name?: string;
  email?: string;
  preferences?: User['preferences'];
}

export async function updateMe(
  payload: MeUpdatePayload,
): Promise<User> {
  const { data } = await api.put<{ data: User }>('/me', payload);
  return data.data;
}
