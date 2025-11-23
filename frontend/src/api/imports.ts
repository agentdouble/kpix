import type { ImportJob } from '../types';
import { USE_DEMO_DATA, request, resolveApiUrl } from './client';
import { demoImports } from './demoData';

export const importsApi = {
  listJobs: async (token?: string | null): Promise<ImportJob[]> => {
    if (USE_DEMO_DATA) {
      return demoImports.listJobs();
    }
    return request<ImportJob[]>('/imports/jobs', { token: token ?? undefined });
  },
  uploadKpiValues: async (file: File, token?: string | null): Promise<ImportJob> => {
    if (USE_DEMO_DATA) {
      return demoImports.upload(file.name);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(resolveApiUrl('/imports/upload'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Import échoué');
    }

    return (await response.json()) as ImportJob;
  },
};
