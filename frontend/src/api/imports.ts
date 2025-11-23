import type { ImportJob } from '../types';
import { USE_DEMO_DATA, request, resolveApiUrl } from './client';
import { demoImports } from './demoData';

type ApiImportJob = {
  id: string;
  organization_id: string;
  type: ImportJob['type'];
  status: ImportJob['status'];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
};

export type ImportResult = {
  job_id: string;
  ingested: number;
  failed: number;
  errors: string[];
};

const mapJob = (payload: ApiImportJob): ImportJob => ({
  id: payload.id,
  organizationId: payload.organization_id,
  type: payload.type,
  status: payload.status,
  createdBy: payload.created_by,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
  errorMessage: payload.error_message,
});

export const importsApi = {
  listJobs: async (token?: string | null): Promise<ImportJob[]> => {
    if (USE_DEMO_DATA) {
      return demoImports.listJobs();
    }
    const data = await request<ApiImportJob[]>('/imports/jobs', { token: token ?? undefined });
    return data.map(mapJob);
  },
  uploadKpiValues: async (file: File, token?: string | null): Promise<ImportResult> => {
    if (USE_DEMO_DATA) {
      const job = await demoImports.upload();
      return { job_id: job.id, ingested: 1, failed: 0, errors: [] };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(resolveApiUrl('/imports/kpi-values'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Import échoué');
    }

    return (await response.json()) as ImportResult;
  },
};
