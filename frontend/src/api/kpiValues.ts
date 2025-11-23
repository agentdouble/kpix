import type { KpiValue } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoKpiValues } from './demoData';

export const kpiValuesApi = {
  list: async (kpiId: string, token?: string | null): Promise<KpiValue[]> => {
    if (USE_DEMO_DATA) {
      return demoKpiValues.list(kpiId);
    }
    return request<KpiValue[]>(`/kpis/${kpiId}/values`, { token: token ?? undefined });
  },
  create: async (
    kpiId: string,
    payload: { period: string; value: number; status: KpiValue['status'] },
    token?: string | null,
  ): Promise<KpiValue> => {
    if (USE_DEMO_DATA) {
      return demoKpiValues.create(kpiId, payload);
    }
    return request<KpiValue>(`/kpis/${kpiId}/values`, {
      method: 'POST',
      body: payload,
      token: token ?? undefined,
    });
  },
};
