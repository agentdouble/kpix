import type {
  ActionItem,
  Comment,
  Dashboard,
  DashboardStats,
  ImportJob,
  Kpi,
  KpiValue,
  OverviewItem,
  User,
} from '../types';

const generateId = () => `demo-${Math.random().toString(16).slice(2)}-${Date.now()}`;

const demoUser: User = {
  id: 'user-1',
  email: 'manager@kpix-demo.com',
  name: 'Demo Manager',
};

let dashboards: Dashboard[] = [
  {
    id: 'dash-ops',
    title: 'Production',
    process: 'Fabrication',
    description: 'Suivi des indicateurs de production',
    stats: { green: 3, orange: 1, red: 1 },
  },
  {
    id: 'dash-log',
    title: 'Logistique',
    process: 'Supply Chain',
    description: 'Livraisons et délais',
    stats: { green: 2, orange: 2, red: 0 },
  },
];

let kpis: Kpi[] = [
  {
    id: 'kpi-quality',
    dashboardId: 'dash-ops',
    name: 'Taux de qualité',
    unit: '%',
    frequency: 'Hebdomadaire',
    status: 'GREEN',
    latestValue: 98,
    target: 97,
    direction: 'UP',
    threshold: { green: 97, red: 94 },
  },
  {
    id: 'kpi-scrap',
    dashboardId: 'dash-ops',
    name: 'Taux de rebut',
    unit: '%',
    frequency: 'Hebdomadaire',
    status: 'ORANGE',
    latestValue: 4.2,
    target: 3,
    direction: 'DOWN',
    threshold: { green: 3, red: 5 },
  },
  {
    id: 'kpi-otd',
    dashboardId: 'dash-log',
    name: 'On-Time Delivery',
    unit: '%',
    frequency: 'Mensuel',
    status: 'GREEN',
    latestValue: 94,
    target: 95,
    direction: 'UP',
    threshold: { green: 95, red: 90 },
  },
  {
    id: 'kpi-delays',
    dashboardId: 'dash-log',
    name: 'Retards moyens',
    unit: 'j',
    frequency: 'Mensuel',
    status: 'ORANGE',
    latestValue: 1.8,
    target: 1,
    direction: 'DOWN',
    threshold: { green: 1, red: 3 },
  },
];

let kpiValues: KpiValue[] = [
  { id: 'kv-1', kpiId: 'kpi-quality', period: '2024-W48', value: 98, status: 'GREEN' },
  { id: 'kv-2', kpiId: 'kpi-quality', period: '2024-W47', value: 97.2, status: 'GREEN' },
  { id: 'kv-3', kpiId: 'kpi-scrap', period: '2024-W48', value: 4.2, status: 'ORANGE' },
  { id: 'kv-4', kpiId: 'kpi-scrap', period: '2024-W47', value: 5.1, status: 'RED' },
  { id: 'kv-5', kpiId: 'kpi-otd', period: '2024-11', value: 94, status: 'GREEN' },
  { id: 'kv-6', kpiId: 'kpi-delays', period: '2024-11', value: 1.8, status: 'ORANGE' },
];

let actions: ActionItem[] = [
  {
    id: 'act-1',
    kpiId: 'kpi-scrap',
    title: 'Audit process étape 3',
    owner: 'Sophie',
    progress: 35,
    status: 'OPEN',
    dueDate: '2024-12-20',
  },
  {
    id: 'act-2',
    kpiId: 'kpi-delays',
    title: 'Revoir planification transport',
    owner: 'Lamine',
    progress: 60,
    status: 'LATE',
    dueDate: '2024-12-05',
  },
];

let comments: Comment[] = [
  {
    id: 'com-1',
    targetId: 'kpi-scrap',
    targetType: 'KPI',
    author: 'Sophie',
    message: 'Changement de fournisseur en cours',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'com-2',
    targetId: 'act-2',
    targetType: 'ACTION',
    author: 'Lamine',
    message: 'En attente validation budget transport',
    createdAt: new Date().toISOString(),
  },
];

let importJobs: ImportJob[] = [
  {
    id: 'job-1',
    filename: 'kpix-novembre.csv',
    status: 'DONE',
    progress: 100,
    startedAt: '2024-12-01T09:00:00Z',
    finishedAt: '2024-12-01T09:05:00Z',
  },
];

const computeStatsForDashboard = (dashboardId: string): DashboardStats => {
  const relatedKpis = kpis.filter((kpi) => kpi.dashboardId === dashboardId);
  const stats: DashboardStats = { green: 0, orange: 0, red: 0 };
  relatedKpis.forEach((kpi) => {
    stats[kpi.status.toLowerCase() as keyof DashboardStats] += 1;
  });
  return stats;
};

const refreshDashboardStats = () => {
  dashboards = dashboards.map((dash) => ({
    ...dash,
    stats: computeStatsForDashboard(dash.id),
  }));
};

export const demoAuth = {
  login: async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }
    return { token: 'demo-token', user: demoUser };
  },
  getMe: async () => demoUser,
};

export const demoDashboards = {
  list: async (): Promise<Dashboard[]> => {
    refreshDashboardStats();
    return dashboards;
  },
  get: async (id: string): Promise<Dashboard> => {
    const dashboard = dashboards.find((d) => d.id === id);
    if (!dashboard) {
      throw new Error('Dashboard introuvable');
    }
    refreshDashboardStats();
    return dashboard;
  },
  create: async (payload: { title: string; process: string; description?: string }) => {
    const dashboard: Dashboard = {
      id: generateId(),
      title: payload.title,
      process: payload.process,
      description: payload.description,
      stats: { green: 0, orange: 0, red: 0 },
    };
    dashboards.push(dashboard);
    return dashboard;
  },
};

export const demoKpis = {
  list: async (dashboardId: string): Promise<Kpi[]> => {
    return kpis.filter((kpi) => kpi.dashboardId === dashboardId);
  },
  get: async (id: string): Promise<Kpi> => {
    const kpi = kpis.find((item) => item.id === id);
    if (!kpi) {
      throw new Error('KPI introuvable');
    }
    return kpi;
  },
  create: async (
    dashboardId: string,
    payload: Pick<Kpi, 'name' | 'frequency' | 'unit' | 'target' | 'direction'>,
  ): Promise<Kpi> => {
    const newKpi: Kpi = {
      id: generateId(),
      dashboardId,
      name: payload.name,
      frequency: payload.frequency,
      unit: payload.unit,
      target: payload.target,
      direction: payload.direction,
      status: 'ORANGE',
      latestValue: undefined,
    };
    kpis.push(newKpi);
    refreshDashboardStats();
    return newKpi;
  },
  update: async (id: string, payload: Partial<Kpi>): Promise<Kpi> => {
    const index = kpis.findIndex((kpi) => kpi.id === id);
    if (index === -1) {
      throw new Error('KPI introuvable');
    }
    const updated = { ...kpis[index], ...payload };
    kpis[index] = updated;
    refreshDashboardStats();
    return updated;
  },
};

export const demoKpiValues = {
  list: async (kpiId: string): Promise<KpiValue[]> => kpiValues.filter((v) => v.kpiId === kpiId),
  create: async (kpiId: string, payload: { period: string; value: number; status: KpiValue['status'] }) => {
    const newValue: KpiValue = {
      id: generateId(),
      kpiId,
      period: payload.period,
      value: payload.value,
      status: payload.status,
    };
    kpiValues.push(newValue);
    const kpi = kpis.find((item) => item.id === kpiId);
    if (kpi) {
      kpi.latestValue = payload.value;
      kpi.status = payload.status;
    }
    refreshDashboardStats();
    return newValue;
  },
};

export const demoActions = {
  list: async (kpiId: string): Promise<ActionItem[]> => actions.filter((a) => a.kpiId === kpiId),
  create: async (
    kpiId: string,
    payload: Pick<ActionItem, 'title' | 'owner' | 'dueDate'> & { progress?: number },
  ): Promise<ActionItem> => {
    const action: ActionItem = {
      id: generateId(),
      kpiId,
      title: payload.title,
      owner: payload.owner,
      dueDate: payload.dueDate,
      progress: payload.progress ?? 0,
      status: 'OPEN',
    };
    actions.push(action);
    return action;
  },
};

export const demoComments = {
  listForKpi: async (kpiId: string): Promise<Comment[]> => comments.filter((c) => c.targetId === kpiId),
  listForAction: async (actionId: string): Promise<Comment[]> => comments.filter((c) => c.targetId === actionId),
  createForKpi: async (
    kpiId: string,
    payload: Pick<Comment, 'author' | 'message'>,
  ): Promise<Comment> => {
    const comment: Comment = {
      id: generateId(),
      targetId: kpiId,
      targetType: 'KPI',
      author: payload.author,
      message: payload.message,
      createdAt: new Date().toISOString(),
    };
    comments.push(comment);
    return comment;
  },
};

export const demoImports = {
  listJobs: async (): Promise<ImportJob[]> => importJobs,
  upload: async (filename: string): Promise<ImportJob> => {
    const job: ImportJob = {
      id: generateId(),
      filename,
      status: 'RUNNING',
      progress: 25,
      startedAt: new Date().toISOString(),
    };
    importJobs = [job, ...importJobs];
    return job;
  },
};

export const demoReporting = {
  overview: async (): Promise<OverviewItem[]> => {
    refreshDashboardStats();
    return dashboards.map((dash) => {
      const relatedActions = actions.filter((action) => {
        const kpi = kpis.find((k) => k.id === action.kpiId);
        return kpi?.dashboardId === dash.id;
      });
      const lateActions = relatedActions.filter((action) => action.status === 'LATE').length;
      return {
        dashboardId: dash.id,
        title: dash.title,
        process: dash.process,
        stats: dash.stats,
        openActions: relatedActions.length,
        lateActions,
      } satisfies OverviewItem;
    });
  },
};
