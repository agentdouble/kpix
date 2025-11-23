import type { DashboardOverview, DirectionOverview, StatusBreakdown } from '../types';
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

  direction: async (token?: string | null): Promise<DirectionOverview> => {
    if (USE_DEMO_DATA) {
      return demoReporting.direction();
    }

    type ApiDirectionKpiSnapshot = {
      kpi_id: string;
      dashboard_id: string;
      dashboard_title: string;
      name: string;
      status: 'GREEN' | 'ORANGE' | 'RED' | null;
      value: number | null;
      period_end: string | null;
    };

    type ApiDirectionKpiTrend = {
      kpi_id: string;
      dashboard_id: string;
      dashboard_title: string;
      name: string;
      direction: 'UP_IS_BETTER' | 'DOWN_IS_BETTER';
      current_value: number | null;
      previous_value: number | null;
      current_status: 'GREEN' | 'ORANGE' | 'RED' | null;
      previous_status: 'GREEN' | 'ORANGE' | 'RED' | null;
      delta: number | null;
      delta_normalized: number | null;
    };

    type ApiDirectionActionSummary = {
      action_id: string;
      kpi_id: string;
      kpi_name: string;
      dashboard_id: string;
      dashboard_title: string;
      title: string;
      status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
      due_date: string | null;
      updated_at: string;
    };

    type ApiDirectionOverview = {
      top_red_kpis: ApiDirectionKpiSnapshot[];
      overdue_actions: ApiDirectionActionSummary[];
      latest_values: ApiDirectionKpiSnapshot[];
      improving_kpis: ApiDirectionKpiTrend[];
      worsening_kpis: ApiDirectionKpiTrend[];
      upcoming_actions_48h: ApiDirectionActionSummary[];
      upcoming_actions_7d: ApiDirectionActionSummary[];
      strategic_kpis: ApiDirectionKpiSnapshot[];
      closed_actions_this_week: ApiDirectionActionSummary[];
    };

    const response = await request<ApiDirectionOverview>('/reporting/direction', { token: token ?? undefined });

    const mapSnapshot = (item: ApiDirectionKpiSnapshot) => ({
      kpiId: item.kpi_id,
      dashboardId: item.dashboard_id,
      dashboardTitle: item.dashboard_title,
      name: item.name,
      status: item.status,
      value: item.value,
      periodEnd: item.period_end,
    });

    const mapTrend = (item: ApiDirectionKpiTrend) => ({
      kpiId: item.kpi_id,
      dashboardId: item.dashboard_id,
      dashboardTitle: item.dashboard_title,
      name: item.name,
      direction: item.direction,
      currentValue: item.current_value,
      previousValue: item.previous_value,
      currentStatus: item.current_status,
      previousStatus: item.previous_status,
      delta: item.delta,
      deltaNormalized: item.delta_normalized,
    });

    const mapAction = (item: ApiDirectionActionSummary) => ({
      actionId: item.action_id,
      kpiId: item.kpi_id,
      kpiName: item.kpi_name,
      dashboardId: item.dashboard_id,
      dashboardTitle: item.dashboard_title,
      title: item.title,
      status: item.status,
      dueDate: item.due_date,
      updatedAt: item.updated_at,
    });

    return {
      topRedKpis: response.top_red_kpis.map(mapSnapshot),
      overdueActions: response.overdue_actions.map(mapAction),
      latestValues: response.latest_values.map(mapSnapshot),
      improvingKpis: response.improving_kpis.map(mapTrend),
      worseningKpis: response.worsening_kpis.map(mapTrend),
      upcomingActions48h: response.upcoming_actions_48h.map(mapAction),
      upcomingActions7d: response.upcoming_actions_7d.map(mapAction),
      strategicKpis: response.strategic_kpis.map(mapSnapshot),
      closedActionsThisWeek: response.closed_actions_this_week.map(mapAction),
    };
  },
};
