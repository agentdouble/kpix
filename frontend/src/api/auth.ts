import type { User } from '../types';
import { USE_DEMO_DATA, request } from './client';
import { demoAuth } from './demoData';

type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  role: User['role'];
  is_active: boolean;
  organization_id: string;
  created_at: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: ApiUser;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

const mapUser = (user: ApiUser): User => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  isActive: user.is_active,
  organizationId: user.organization_id,
  createdAt: user.created_at,
});

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    if (USE_DEMO_DATA) {
      const result = await demoAuth.login(email, password);
      return {
        accessToken: result.token,
        refreshToken: result.token,
        user: result.user,
      };
    }

    const response = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: mapUser(response.user),
    };
  },
  getMe: async (token: string): Promise<User> => {
    if (USE_DEMO_DATA) {
      return demoAuth.getMe();
    }
    const response = await request<ApiUser>('/auth/me', { token });
    return mapUser(response);
  },
  signup: async (params: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }): Promise<LoginResponse> => {
    if (USE_DEMO_DATA) {
      throw new Error('La création de compte est désactivée en mode démo.');
    }
    const response = await request<TokenResponse>('/auth/signup', {
      method: 'POST',
      body: {
        email: params.email,
        password: params.password,
        full_name: params.fullName,
        organization_name: params.organizationName,
      },
    });
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: mapUser(response.user),
    };
  },
};
