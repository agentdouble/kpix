export type User = {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  organizationId: string;
  createdAt: string;
};

export type StatusBreakdown = {
  GREEN: number;
  ORANGE: number;
  RED: number;
};

export type Dashboard = {
  id: string;
  organizationId: string;
  ownerId?: string | null;
  title: string;
  description?: string | null;
  processName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardOverview = {
  dashboardId: string;
  title: string;
  processName: string | null;
  totalKpis: number;
  statusBreakdown: StatusBreakdown;
  openActions: number;
  overdueActions: number;
};

export type KpiDirection = 'UP_IS_BETTER' | 'DOWN_IS_BETTER';
export type KpiFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type KpiStatus = 'GREEN' | 'ORANGE' | 'RED';
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type ImportStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type ImportType = 'EXCEL' | 'API';

export type Kpi = {
  id: string;
  dashboardId: string;
  organizationId: string;
  ownerId?: string | null;
  name: string;
  unit?: string | null;
  frequency: KpiFrequency;
  direction: KpiDirection;
  thresholdGreen: number;
  thresholdOrange: number;
  thresholdRed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
   latestValue?: number | null;
   latestStatus?: KpiStatus | null;
   latestPeriodEnd?: string | null;
};

export type KpiValue = {
  id: string;
  kpiId: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  status: KpiStatus;
  comment?: string | null;
  createdAt: string;
};

export type ActionItem = {
  id: string;
  kpiId: string;
  organizationId: string;
  title: string;
  description?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
  progress: number;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  kpiId?: string | null;
  actionPlanId?: string | null;
  organizationId: string;
  authorId?: string | null;
  content: string;
  createdAt: string;
};

export type ImportJob = {
  id: string;
  organizationId: string;
  type: ImportType;
  status: ImportStatus;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
};

export type DirectionKpiSnapshot = {
  kpiId: string;
  dashboardId: string;
  dashboardTitle: string;
  name: string;
  status: KpiStatus | null;
  value: number | null;
  periodEnd: string | null;
};

export type DirectionKpiTrend = {
  kpiId: string;
  dashboardId: string;
  dashboardTitle: string;
  name: string;
  direction: KpiDirection;
  currentValue: number | null;
  previousValue: number | null;
  currentStatus: KpiStatus | null;
  previousStatus: KpiStatus | null;
  delta: number | null;
  deltaNormalized: number | null;
};

export type DirectionActionSummary = {
  actionId: string;
  kpiId: string;
  kpiName: string;
  dashboardId: string;
  dashboardTitle: string;
  title: string;
  status: ActionStatus;
  dueDate: string | null;
  updatedAt: string;
};

export type DirectionOverview = {
  topRedKpis: DirectionKpiSnapshot[];
  overdueActions: DirectionActionSummary[];
  latestValues: DirectionKpiSnapshot[];
  improvingKpis: DirectionKpiTrend[];
  worseningKpis: DirectionKpiTrend[];
  upcomingActions48h: DirectionActionSummary[];
  upcomingActions7d: DirectionActionSummary[];
  strategicKpis: DirectionKpiSnapshot[];
  closedActionsThisWeek: DirectionActionSummary[];
};
