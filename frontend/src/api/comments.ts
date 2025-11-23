import type { Comment } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoComments } from './demoData';

export const commentsApi = {
  listForKpi: async (kpiId: string, token?: string | null): Promise<Comment[]> => {
    if (USE_DEMO_DATA) {
      return demoComments.listForKpi(kpiId);
    }
    return request<Comment[]>(`/kpis/${kpiId}/comments`, { token: token ?? undefined });
  },
  listForAction: async (actionId: string, token?: string | null): Promise<Comment[]> => {
    if (USE_DEMO_DATA) {
      return demoComments.listForAction(actionId);
    }
    return request<Comment[]>(`/actions/${actionId}/comments`, { token: token ?? undefined });
  },
  createForKpi: async (
    kpiId: string,
    payload: Pick<Comment, 'author' | 'message'>,
    token?: string | null,
  ): Promise<Comment> => {
    if (USE_DEMO_DATA) {
      return demoComments.createForKpi(kpiId, payload);
    }
    return request<Comment>(`/kpis/${kpiId}/comments`, {
      method: 'POST',
      body: payload,
      token: token ?? undefined,
    });
  },
};
