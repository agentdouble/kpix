import type { Kpi, KpiDirection, KpiFrequency } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoKpis } from './demoData';

type ApiKpi = {
  id: string;
  dashboard_id: string;
  organization_id: string;
  owner_id?: string | null;
  name: string;
  unit?: string | null;
  frequency: KpiFrequency;
  direction: KpiDirection;
  threshold_green: number;
  threshold_orange: number;
  threshold_red: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const mapKpi = (payload: ApiKpi): Kpi => ({
  id: payload.id,
  dashboardId: payload.dashboard_id,
  organizationId: payload.organization_id,
  ownerId: payload.owner_id ?? null,
  name: payload.name,
  unit: payload.unit,
  frequency: payload.frequency,
  direction: payload.direction,
  thresholdGreen: payload.threshold_green,
  thresholdOrange: payload.threshold_orange,
  thresholdRed: payload.threshold_red,
  isActive: payload.is_active,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
});

export const kpisApi = {
  list: async (dashboardId: string, token?: string | null): Promise<Kpi[]> => {
    if (USE_DEMO_DATA) {
      return demoKpis.list(dashboardId);
    }
    const data = await request<ApiKpi[]>(`/dashboards/${dashboardId}/kpis`, { token: token ?? undefined });
    return data.map(mapKpi);
  },
  get: async (id: string, token?: string | null): Promise<Kpi> => {
    if (USE_DEMO_DATA) {
      return demoKpis.get(id);
    }
    const data = await request<ApiKpi>(`/kpis/${id}`, { token: token ?? undefined });
    return mapKpi(data);
  },
  create: async (
    dashboardId: string,
    payload: {
      name: string;
      frequency: KpiFrequency;
      unit?: string;
      direction: KpiDirection;
      thresholdGreen: number;
      thresholdOrange: number;
      thresholdRed: number;
    },
    token?: string | null,
  ): Promise<Kpi> => {
    if (USE_DEMO_DATA) {
      return demoKpis.create(dashboardId, payload);
    }
    const data = await request<ApiKpi>(`/dashboards/${dashboardId}/kpis`, {
      method: 'POST',
      body: {
        name: payload.name,
        unit: payload.unit,
        frequency: payload.frequency,
        direction: payload.direction,
        threshold_green: payload.thresholdGreen,
        threshold_orange: payload.thresholdOrange,
        threshold_red: payload.thresholdRed,
      },
      token: token ?? undefined,
    });
    return mapKpi(data);
  },
  update: async (id: string, payload: Partial<Kpi>, token?: string | null): Promise<Kpi> => {
    if (USE_DEMO_DATA) {
      return demoKpis.update(id, payload);
    }
    const data = await request<ApiKpi>(`/kpis/${id}`, {
      method: 'PATCH',
      body: {
        name: payload.name,
        unit: payload.unit,
        frequency: payload.frequency,
        direction: payload.direction,
        threshold_green: payload.thresholdGreen,
        threshold_orange: payload.thresholdOrange,
        threshold_red: payload.thresholdRed,
        owner_id: payload.ownerId,
        is_active: payload.isActive,
      },
      token: token ?? undefined,
    });
    return mapKpi(data);
  },
};
