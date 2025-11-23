import type { ActionItem } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoActions } from './demoData';

export const actionsApi = {
  list: async (kpiId: string, token?: string | null): Promise<ActionItem[]> => {
    if (USE_DEMO_DATA) {
      return demoActions.list(kpiId);
    }
    return request<ActionItem[]>(`/kpis/${kpiId}/actions`, { token: token ?? undefined });
  },
  create: async (
    kpiId: string,
    payload: Pick<ActionItem, 'title' | 'owner' | 'dueDate'> & { progress?: number },
    token?: string | null,
  ): Promise<ActionItem> => {
    if (USE_DEMO_DATA) {
      return demoActions.create(kpiId, payload);
    }
    return request<ActionItem>(`/kpis/${kpiId}/actions`, {
      method: 'POST',
      body: payload,
      token: token ?? undefined,
    });
  },
};
