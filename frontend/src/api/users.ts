import type { User } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoUsers } from './demoData';

export const usersApi = {
  listMembers: async (token?: string | null): Promise<User[]> => {
    if (USE_DEMO_DATA) {
      return demoUsers.list();
    }
    return request<User[]>('/users/members', { token: token ?? undefined });
  },
};

