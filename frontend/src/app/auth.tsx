import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth';
import { USE_DEMO_DATA } from '../api/client';
import type { User } from '../types';

type AuthContextValue = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  initializing: boolean;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const ACCESS_TOKEN_KEY = 'kpil_access_token';
const REFRESH_TOKEN_KEY = 'kpil_refresh_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        const me = await authApi.getMe(token);
        setUser(me);
      } catch (error) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setToken(null);
        setRefreshToken(null);
        console.error(error);
      } finally {
        setInitializing(false);
      }
    };
    fetchProfile();
  }, [token]);

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const result = await authApi.login(email, password);
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setUser(result.user);
  }, []);

  const value = useMemo(
    () => ({ token, refreshToken, user, initializing, login, logout }),
    [token, refreshToken, user, initializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

export const isDemoMode = USE_DEMO_DATA;
