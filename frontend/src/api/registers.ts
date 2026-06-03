import { api } from './client';

export type RegisterType = 'inpatient' | 'outpatient' | 'laboratory';

const FILENAMES: Record<RegisterType, string> = {
  inpatient: 'Inpatient-Management-Register.xlsx',
  outpatient: 'Outpatient-Management-Register.xlsx',
  laboratory: 'Laboratory-Outpatient-Request.xlsx',
};

/**
 * Downloads the branded .xlsx export for a register. Uses the authenticated
 * axios client (so the bearer token is sent) and triggers a browser download.
 */
export async function downloadRegisterExcel(type: RegisterType): Promise<void> {
  const res = await api.get(`/registers/${type}/export`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = FILENAMES[type];
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
