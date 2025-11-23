export type User = {
  id: string;
  email: string;
  name: string;
};

export type DashboardStats = {
  green: number;
  orange: number;
  red: number;
};

export type Dashboard = {
  id: string;
  title: string;
  process: string;
  description?: string;
  stats: DashboardStats;
};

export type Kpi = {
  id: string;
  dashboardId: string;
  name: string;
  unit?: string;
  frequency: string;
  status: 'GREEN' | 'ORANGE' | 'RED';
  latestValue?: number;
  target?: number;
  direction?: 'UP' | 'DOWN';
  threshold?: {
    green: number;
    red: number;
  };
};

export type KpiValue = {
  id: string;
  kpiId: string;
  period: string;
  value: number;
  status: 'GREEN' | 'ORANGE' | 'RED';
};

export type ActionItem = {
  id: string;
  kpiId: string;
  title: string;
  owner: string;
  progress: number;
  status: 'OPEN' | 'LATE' | 'DONE';
  dueDate?: string;
};

export type Comment = {
  id: string;
  targetId: string;
  targetType: 'KPI' | 'ACTION';
  author: string;
  message: string;
  createdAt: string;
};

export type OverviewItem = {
  dashboardId: string;
  title: string;
  process: string;
  stats: DashboardStats;
  openActions: number;
  lateActions: number;
};

export type ImportJob = {
  id: string;
  filename: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  progress: number;
  startedAt: string;
  finishedAt?: string;
};
