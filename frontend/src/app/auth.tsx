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
  user: User | null;
  initializing: boolean;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = 'kpix_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
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
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        console.error(error);
      } finally {
        setInitializing(false);
      }
    };
    fetchProfile();
  }, [token]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const result = await authApi.login(email, password);
    setToken(result.token);
    localStorage.setItem(TOKEN_KEY, result.token);
    const profile = result.user ?? (await authApi.getMe(result.token));
    setUser(profile);
  }, []);

  const value = useMemo(
    () => ({ token, user, initializing, login, logout }),
    [token, user, initializing, login, logout],
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
