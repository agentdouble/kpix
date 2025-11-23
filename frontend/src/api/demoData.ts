import type {
  ActionItem,
  Comment,
  Dashboard,
  DashboardOverview,
  ImportJob,
  Kpi,
  KpiDirection,
  KpiStatus,
  KpiValue,
  StatusBreakdown,
  User,
} from '../types';

const now = new Date().toISOString();
const orgId = 'org-demo';

export const demoUser: User = {
  id: 'user-1',
  email: 'manager@kpix-demo.com',
  fullName: 'Demo Manager',
  role: 'ADMIN',
  isActive: true,
  organizationId: orgId,
  createdAt: now,
};

const makeId = () => `demo-${Math.random().toString(16).slice(2)}-${Date.now()}`;

let dashboards: Dashboard[] = [
  {
    id: 'dash-ops',
    organizationId: orgId,
    ownerId: demoUser.id,
    title: 'Production',
    description: 'Suivi des indicateurs de production',
    processName: 'Fabrication',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'dash-log',
    organizationId: orgId,
    ownerId: demoUser.id,
    title: 'Logistique',
    description: 'Livraisons et délais',
    processName: 'Supply Chain',
    createdAt: now,
    updatedAt: now,
  },
];

let kpis: Kpi[] = [
  {
    id: 'kpi-quality',
    dashboardId: 'dash-ops',
    organizationId: orgId,
    ownerId: demoUser.id,
    name: 'Taux de qualité',
    unit: '%',
    frequency: 'WEEKLY',
    direction: 'UP_IS_BETTER',
    thresholdGreen: 97,
    thresholdOrange: 95,
    thresholdRed: 93,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'kpi-scrap',
    dashboardId: 'dash-ops',
    organizationId: orgId,
    ownerId: demoUser.id,
    name: 'Taux de rebut',
    unit: '%',
    frequency: 'WEEKLY',
    direction: 'DOWN_IS_BETTER',
    thresholdGreen: 3,
    thresholdOrange: 4,
    thresholdRed: 5,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'kpi-otd',
    dashboardId: 'dash-log',
    organizationId: orgId,
    ownerId: demoUser.id,
    name: 'On-Time Delivery',
    unit: '%',
    frequency: 'MONTHLY',
    direction: 'UP_IS_BETTER',
    thresholdGreen: 95,
    thresholdOrange: 92,
    thresholdRed: 88,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

let kpiValues: KpiValue[] = [
  {
    id: 'kv-1',
    kpiId: 'kpi-quality',
    organizationId: orgId,
    periodStart: '2024-12-02',
    periodEnd: '2024-12-02',
    value: 98,
    status: 'GREEN',
    comment: null,
    createdAt: now,
  },
  {
    id: 'kv-2',
    kpiId: 'kpi-quality',
    organizationId: orgId,
    periodStart: '2024-11-25',
    periodEnd: '2024-11-25',
    value: 97.2,
    status: 'GREEN',
    comment: null,
    createdAt: now,
  },
  {
    id: 'kv-3',
    kpiId: 'kpi-scrap',
    organizationId: orgId,
    periodStart: '2024-12-02',
    periodEnd: '2024-12-02',
    value: 4.2,
    status: 'ORANGE',
    comment: null,
    createdAt: now,
  },
  {
    id: 'kv-4',
    kpiId: 'kpi-otd',
    organizationId: orgId,
    periodStart: '2024-12-01',
    periodEnd: '2024-12-31',
    value: 94,
    status: 'ORANGE',
    comment: null,
    createdAt: now,
  },
];

let actions: ActionItem[] = [
  {
    id: 'act-1',
    kpiId: 'kpi-scrap',
    organizationId: orgId,
    title: 'Audit process étape 3',
    description: 'Valider les contrôles en fin de ligne',
    ownerId: demoUser.id,
    dueDate: '2024-12-20',
    progress: 35,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'act-2',
    kpiId: 'kpi-otd',
    organizationId: orgId,
    title: 'Revoir planification transport',
    description: 'Aligner les créneaux avec les transporteurs',
    ownerId: demoUser.id,
    dueDate: '2024-12-05',
    progress: 60,
    status: 'IN_PROGRESS',
    createdAt: now,
    updatedAt: now,
  },
];

let comments: Comment[] = [
  {
    id: 'com-1',
    kpiId: 'kpi-scrap',
    actionPlanId: null,
    organizationId: orgId,
    authorId: demoUser.id,
    content: 'Changement de fournisseur en cours',
    createdAt: now,
  },
  {
    id: 'com-2',
    kpiId: null,
    actionPlanId: 'act-2',
    organizationId: orgId,
    authorId: demoUser.id,
    content: 'En attente validation budget transport',
    createdAt: now,
  },
];

let importJobs: ImportJob[] = [
  {
    id: 'job-1',
    organizationId: orgId,
    type: 'EXCEL',
    status: 'SUCCESS',
    createdBy: demoUser.id,
    createdAt: now,
    updatedAt: now,
    errorMessage: null,
  },
];

const computeStatus = (direction: KpiDirection, thresholds: { green: number; orange: number; red: number }, value: number): KpiStatus => {
  if (direction === 'UP_IS_BETTER') {
    if (value >= thresholds.green) return 'GREEN';
    if (value >= thresholds.orange) return 'ORANGE';
    return 'RED';
  }
  if (value <= thresholds.green) return 'GREEN';
  if (value <= thresholds.orange) return 'ORANGE';
  return 'RED';
};

export const demoUsers = {
  list: async (): Promise<User[]> => [demoUser],
};

const latestStatuses = (): Record<string, KpiStatus> => {
  const latest: Record<string, KpiStatus> = {};
  kpiValues
    .slice()
    .sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))
    .forEach((value) => {
      if (!latest[value.kpiId]) {
        latest[value.kpiId] = value.status;
      }
    });
  return latest;
};

const statusBreakdownForDashboard = (dashboardId: string): StatusBreakdown => {
  const statuses = latestStatuses();
  const breakdown: StatusBreakdown = { GREEN: 0, ORANGE: 0, RED: 0 };
  kpis
    .filter((kpi) => kpi.dashboardId === dashboardId)
    .forEach((kpi) => {
      const status = statuses[kpi.id];
      if (status) {
        breakdown[status] += 1;
      }
    });
  return breakdown;
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
  list: async (): Promise<Dashboard[]> => dashboards,
  get: async (id: string): Promise<Dashboard> => {
    const dashboard = dashboards.find((d) => d.id === id);
    if (!dashboard) {
      throw new Error('Dashboard introuvable');
    }
    return dashboard;
  },
  create: async (payload: { title: string; process: string; description?: string }): Promise<Dashboard> => {
    const dashboard: Dashboard = {
      id: makeId(),
      organizationId: orgId,
      ownerId: demoUser.id,
      title: payload.title,
      description: payload.description,
      processName: payload.process,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dashboards = [...dashboards, dashboard];
    return dashboard;
  },
};

export const demoKpis = {
  list: async (dashboardId: string): Promise<Kpi[]> => kpis.filter((kpi) => kpi.dashboardId === dashboardId),
  get: async (id: string): Promise<Kpi> => {
    const kpi = kpis.find((item) => item.id === id);
    if (!kpi) {
      throw new Error('KPI introuvable');
    }
    return kpi;
  },
  create: async (
    dashboardId: string,
    payload: {
      name: string;
      frequency: Kpi['frequency'];
      unit?: string;
      direction: Kpi['direction'];
      thresholdGreen: number;
      thresholdOrange: number;
      thresholdRed: number;
    },
  ): Promise<Kpi> => {
    const kpi: Kpi = {
      id: makeId(),
      dashboardId,
      organizationId: orgId,
      ownerId: demoUser.id,
      name: payload.name,
      unit: payload.unit,
      frequency: payload.frequency,
      direction: payload.direction,
      thresholdGreen: payload.thresholdGreen,
      thresholdOrange: payload.thresholdOrange,
      thresholdRed: payload.thresholdRed,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    kpis = [...kpis, kpi];
    return kpi;
  },
  update: async (id: string, payload: Partial<Kpi>): Promise<Kpi> => {
    kpis = kpis.map((kpi) => (kpi.id === id ? { ...kpi, ...payload, updatedAt: new Date().toISOString() } : kpi));
    const updated = kpis.find((kpi) => kpi.id === id);
    if (!updated) {
      throw new Error('KPI introuvable');
    }
    return updated;
  },
};

export const demoKpiValues = {
  list: async (kpiId: string): Promise<KpiValue[]> =>
    kpiValues
      .filter((value) => value.kpiId === kpiId)
      .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)),
  create: async (
    kpiId: string,
    payload: { periodStart: string; periodEnd?: string; value: number; comment?: string },
  ): Promise<KpiValue> => {
    const kpi = kpis.find((item) => item.id === kpiId);
    if (!kpi) {
      throw new Error('KPI introuvable');
    }
    const status = computeStatus(
      kpi.direction,
      { green: kpi.thresholdGreen, orange: kpi.thresholdOrange, red: kpi.thresholdRed },
      payload.value,
    );
    const newValue: KpiValue = {
      id: makeId(),
      kpiId,
      organizationId: orgId,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd ?? payload.periodStart,
      value: payload.value,
      status,
      comment: payload.comment,
      createdAt: new Date().toISOString(),
    };
    kpiValues = [newValue, ...kpiValues];
    return newValue;
  },
};

export const demoActions = {
  list: async (kpiId: string): Promise<ActionItem[]> => actions.filter((action) => action.kpiId === kpiId),
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
  ): Promise<ActionItem> => {
    const action: ActionItem = {
      id: makeId(),
      kpiId,
      organizationId: orgId,
      title: payload.title,
      description: payload.description,
      ownerId: payload.ownerId ?? demoUser.id,
      dueDate: payload.dueDate,
      progress: payload.progress ?? 0,
      status: payload.status ?? 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    actions = [...actions, action];
    return action;
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
  ): Promise<ActionItem> => {
    actions = actions.map((action) =>
      action.id === actionId
        ? {
            ...action,
            title: payload.title ?? action.title,
            description: payload.description ?? action.description,
            ownerId: payload.ownerId ?? action.ownerId,
            dueDate: payload.dueDate ?? action.dueDate,
            progress: payload.progress ?? action.progress,
            status: payload.status ?? action.status,
            updatedAt: new Date().toISOString(),
          }
        : action,
    );
    const updated = actions.find((action) => action.id === actionId);
    if (!updated) {
      throw new Error('Action introuvable');
    }
    return updated;
  },
};

export const demoComments = {
  listForKpi: async (kpiId: string): Promise<Comment[]> => comments.filter((comment) => comment.kpiId === kpiId),
  listForAction: async (actionId: string): Promise<Comment[]> =>
    comments.filter((comment) => comment.actionPlanId === actionId),
  createForKpi: async (kpiId: string, payload: { author: string; message: string }): Promise<Comment> => {
    const comment: Comment = {
      id: makeId(),
      kpiId,
      actionPlanId: null,
      organizationId: orgId,
      authorId: demoUser.id,
      content: payload.message,
      createdAt: new Date().toISOString(),
    };
    comments = [...comments, comment];
    return comment;
  },
};

export const demoImports = {
  listJobs: async (): Promise<ImportJob[]> => importJobs,
  upload: async (): Promise<ImportJob> => {
    const job: ImportJob = {
      id: makeId(),
      organizationId: orgId,
      type: 'EXCEL',
      status: 'SUCCESS',
      createdBy: demoUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    };
    importJobs = [job, ...importJobs];
    return job;
  },
};

export const demoReporting = {
  overview: async (): Promise<DashboardOverview[]> => {
    const today = new Date().toISOString().slice(0, 10);
    return dashboards.map((dashboard) => {
      const dashboardActions = actions.filter((action) => action.kpiId && kpis.find((kpi) => kpi.id === action.kpiId)?.dashboardId === dashboard.id);
      const openActions = dashboardActions.filter((action) => ['OPEN', 'IN_PROGRESS'].includes(action.status)).length;
      const overdueActions = dashboardActions.filter(
        (action) => action.dueDate && action.dueDate < today && ['OPEN', 'IN_PROGRESS'].includes(action.status),
      ).length;
      return {
        dashboardId: dashboard.id,
        title: dashboard.title,
        processName: dashboard.processName ?? null,
        totalKpis: kpis.filter((kpi) => kpi.dashboardId === dashboard.id).length,
        statusBreakdown: statusBreakdownForDashboard(dashboard.id),
        openActions,
        overdueActions,
      };
    });
  },
};
