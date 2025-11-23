import type { User } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoAuth } from './demoData';

type LoginResponse = {
  token: string;
  user?: User;
};

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    if (USE_DEMO_DATA) {
      return demoAuth.login(email, password);
    }

    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },
  getMe: async (token: string): Promise<User> => {
    if (USE_DEMO_DATA) {
      return demoAuth.getMe();
    }
    return request<User>('/auth/me', { token });
  },
};
