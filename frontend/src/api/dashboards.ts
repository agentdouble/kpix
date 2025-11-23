import type { Dashboard } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoDashboards } from './demoData';

export const dashboardsApi = {
  list: async (token?: string | null): Promise<Dashboard[]> => {
    if (USE_DEMO_DATA) {
      return demoDashboards.list();
    }
    return request<Dashboard[]>('/dashboards', { token: token ?? undefined });
  },
  get: async (id: string, token?: string | null): Promise<Dashboard> => {
    if (USE_DEMO_DATA) {
      return demoDashboards.get(id);
    }
    return request<Dashboard>(`/dashboards/${id}`, { token: token ?? undefined });
  },
  create: async (
    payload: { title: string; process: string; description?: string },
    token?: string | null,
  ): Promise<Dashboard> => {
    if (USE_DEMO_DATA) {
      return demoDashboards.create(payload);
    }
    return request<Dashboard>('/dashboards', { method: 'POST', body: payload, token: token ?? undefined });
  },
};
