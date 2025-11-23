import type { DashboardOverview, StatusBreakdown } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoReporting } from './demoData';

type ApiDashboardOverview = {
  dashboard_id: string;
  title: string;
  process_name: string | null;
  total_kpis: number;
  status_breakdown: StatusBreakdown;
  open_actions: number;
  overdue_actions: number;
};

type ApiReportingOverview = {
  dashboards: ApiDashboardOverview[];
};

const mapOverview = (payload: ApiDashboardOverview): DashboardOverview => ({
  dashboardId: payload.dashboard_id,
  title: payload.title,
  processName: payload.process_name,
  totalKpis: payload.total_kpis,
  statusBreakdown: payload.status_breakdown,
  openActions: payload.open_actions,
  overdueActions: payload.overdue_actions,
});

export const reportingApi = {
  overview: async (token?: string | null): Promise<DashboardOverview[]> => {
    if (USE_DEMO_DATA) {
      return demoReporting.overview();
    }
    const response = await request<ApiReportingOverview>('/reporting/overview', { token: token ?? undefined });
    return response.dashboards.map(mapOverview);
  },
};
