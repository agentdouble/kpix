import type { Comment } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoComments } from './demoData';

type ApiComment = {
  id: string;
  kpi_id?: string | null;
  action_plan_id?: string | null;
  organization_id: string;
  author_id?: string | null;
  content: string;
  created_at: string;
};

const mapComment = (payload: ApiComment): Comment => ({
  id: payload.id,
  kpiId: payload.kpi_id,
  actionPlanId: payload.action_plan_id,
  organizationId: payload.organization_id,
  authorId: payload.author_id,
  content: payload.content,
  createdAt: payload.created_at,
});

export const commentsApi = {
  listForKpi: async (kpiId: string, token?: string | null): Promise<Comment[]> => {
    if (USE_DEMO_DATA) {
      return demoComments.listForKpi(kpiId);
    }
    const data = await request<ApiComment[]>(`/kpis/${kpiId}/comments`, { token: token ?? undefined });
    return data.map(mapComment);
  },
  listForAction: async (actionId: string, token?: string | null): Promise<Comment[]> => {
    if (USE_DEMO_DATA) {
      return demoComments.listForAction(actionId);
    }
    const data = await request<ApiComment[]>(`/actions/${actionId}/comments`, { token: token ?? undefined });
    return data.map(mapComment);
  },
  createForKpi: async (kpiId: string, payload: { content: string }, token?: string | null): Promise<Comment> => {
    if (USE_DEMO_DATA) {
      return demoComments.createForKpi(kpiId, { author: 'Moi', message: payload.content });
    }
    const data = await request<ApiComment>(`/kpis/${kpiId}/comments`, {
      method: 'POST',
      body: payload,
      token: token ?? undefined,
    });
    return mapComment(data);
  },
};
