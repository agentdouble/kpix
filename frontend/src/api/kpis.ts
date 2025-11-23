import type { Kpi } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoKpis } from './demoData';

export const kpisApi = {
  list: async (dashboardId: string, token?: string | null): Promise<Kpi[]> => {
    if (USE_DEMO_DATA) {
      return demoKpis.list(dashboardId);
    }
    return request<Kpi[]>(`/dashboards/${dashboardId}/kpis`, { token: token ?? undefined });
  },
  get: async (id: string, token?: string | null): Promise<Kpi> => {
    if (USE_DEMO_DATA) {
      return demoKpis.get(id);
    }
    return request<Kpi>(`/kpis/${id}`, { token: token ?? undefined });
  },
  create: async (
    dashboardId: string,
    payload: Pick<Kpi, 'name' | 'frequency' | 'unit' | 'target' | 'direction'>,
    token?: string | null,
  ): Promise<Kpi> => {
    if (USE_DEMO_DATA) {
      return demoKpis.create(dashboardId, payload);
    }
    return request<Kpi>(`/dashboards/${dashboardId}/kpis`, {
      method: 'POST',
      body: payload,
      token: token ?? undefined,
    });
  },
  update: async (id: string, payload: Partial<Kpi>, token?: string | null): Promise<Kpi> => {
    if (USE_DEMO_DATA) {
      return demoKpis.update(id, payload);
    }
    return request<Kpi>(`/kpis/${id}`, { method: 'PUT', body: payload, token: token ?? undefined });
  },
};
