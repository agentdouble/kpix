import type { OverviewItem } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoReporting } from './demoData';

export const reportingApi = {
  overview: async (token?: string | null): Promise<OverviewItem[]> => {
    if (USE_DEMO_DATA) {
      return demoReporting.overview();
    }
    return request<OverviewItem[]>('/reporting/overview', { token: token ?? undefined });
  },
};
