import type { ActionItem } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoActions } from './demoData';

type ApiAction = {
  id: string;
  kpi_id: string;
  organization_id: string;
  title: string;
  description?: string | null;
  owner_id?: string | null;
  due_date?: string | null;
  progress: number;
  status: ActionItem['status'];
  created_at: string;
  updated_at: string;
};

const mapAction = (payload: ApiAction): ActionItem => ({
  id: payload.id,
  kpiId: payload.kpi_id,
  organizationId: payload.organization_id,
  title: payload.title,
  description: payload.description,
  ownerId: payload.owner_id,
  dueDate: payload.due_date,
  progress: payload.progress,
  status: payload.status,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
});

export const actionsApi = {
  list: async (kpiId: string, token?: string | null): Promise<ActionItem[]> => {
    if (USE_DEMO_DATA) {
      return demoActions.list(kpiId);
    }
    const data = await request<ApiAction[]>(`/kpis/${kpiId}/actions`, { token: token ?? undefined });
    return data.map(mapAction);
  },
  create: async (
    kpiId: string,
    payload: {
      title: string;
      description?: string;
      dueDate?: string;
      ownerId?: string;
      progress?: number;
      status?: ActionItem['status'];
    },
    token?: string | null,
  ): Promise<ActionItem> => {
    if (USE_DEMO_DATA) {
      return demoActions.create(kpiId, {
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        progress: payload.progress,
        ownerId: payload.ownerId,
        status: payload.status,
      });
    }
    const data = await request<ApiAction>(`/kpis/${kpiId}/actions`, {
      method: 'POST',
      body: {
        title: payload.title,
        description: payload.description,
        owner_id: payload.ownerId,
        due_date: payload.dueDate,
        progress: payload.progress ?? 0,
        status: payload.status ?? 'OPEN',
      },
      token: token ?? undefined,
    });
    return mapAction(data);
  },
  update: async (
    actionId: string,
    payload: {
      title?: string;
      description?: string;
      ownerId?: string | null;
      dueDate?: string | null;
      progress?: number;
      status?: ActionItem['status'];
    },
    token?: string | null,
  ): Promise<ActionItem> => {
    if (USE_DEMO_DATA) {
      return demoActions.update(actionId, payload);
    }
    const data = await request<ApiAction>(`/actions/${actionId}`, {
      method: 'PATCH',
      body: {
        title: payload.title,
        description: payload.description,
        owner_id: payload.ownerId,
        due_date: payload.dueDate,
        progress: payload.progress,
        status: payload.status,
      },
      token: token ?? undefined,
    });
    return mapAction(data);
  },
};
