import type { Dashboard } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoDashboards } from './demoData';

type ApiDashboard = {
  id: string;
  organization_id: string;
  owner_id?: string | null;
  title: string;
  description?: string | null;
  process_name?: string | null;
  created_at: string;
  updated_at: string;
};

const mapDashboard = (payload: ApiDashboard): Dashboard => ({
  id: payload.id,
  organizationId: payload.organization_id,
  ownerId: payload.owner_id ?? null,
  title: payload.title,
  description: payload.description,
  processName: payload.process_name,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
});

export const dashboardsApi = {
  list: async (token?: string | null): Promise<Dashboard[]> => {
    if (USE_DEMO_DATA) {
      return demoDashboards.list();
    }
    const data = await request<ApiDashboard[]>('/dashboards', { token: token ?? undefined });
    return data.map(mapDashboard);
  },
  get: async (id: string, token?: string | null): Promise<Dashboard> => {
    if (USE_DEMO_DATA) {
      return demoDashboards.get(id);
    }
    const data = await request<ApiDashboard>(`/dashboards/${id}`, { token: token ?? undefined });
    return mapDashboard(data);
  },
  create: async (
    payload: { title: string; processName?: string; description?: string },
    token?: string | null,
  ): Promise<Dashboard> => {
    if (USE_DEMO_DATA) {
      return demoDashboards.create({ title: payload.title, process: payload.processName ?? '', description: payload.description });
    }
    const data = await request<ApiDashboard>('/dashboards', {
      method: 'POST',
      body: {
        title: payload.title,
        process_name: payload.processName,
        description: payload.description,
      },
      token: token ?? undefined,
    });
    return mapDashboard(data);
  },
};
