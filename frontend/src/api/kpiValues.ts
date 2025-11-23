import type { KpiValue } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoKpiValues } from './demoData';

type ApiKpiValue = {
  id: string;
  kpi_id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  value: number;
  status: KpiValue['status'];
  comment?: string | null;
  created_at: string;
};

const mapKpiValue = (payload: ApiKpiValue): KpiValue => ({
  id: payload.id,
  kpiId: payload.kpi_id,
  organizationId: payload.organization_id,
  periodStart: payload.period_start,
  periodEnd: payload.period_end,
  value: payload.value,
  status: payload.status,
  comment: payload.comment,
  createdAt: payload.created_at,
});

export const kpiValuesApi = {
  list: async (kpiId: string, token?: string | null): Promise<KpiValue[]> => {
    if (USE_DEMO_DATA) {
      return demoKpiValues.list(kpiId);
    }
    const data = await request<ApiKpiValue[]>(`/kpis/${kpiId}/values`, { token: token ?? undefined });
    return data.map(mapKpiValue);
  },
  create: async (
    kpiId: string,
    payload: { periodStart: string; periodEnd?: string; value: number; comment?: string },
    token?: string | null,
  ): Promise<KpiValue> => {
    if (USE_DEMO_DATA) {
      return demoKpiValues.create(kpiId, {
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        value: payload.value,
        comment: payload.comment,
      });
    }
    const data = await request<ApiKpiValue>(`/kpis/${kpiId}/values`, {
      method: 'POST',
      body: {
        period_start: payload.periodStart,
        period_end: payload.periodEnd || undefined,
        value: payload.value,
        comment: payload.comment,
      },
      token: token ?? undefined,
    });
    return mapKpiValue(data);
  },
};
