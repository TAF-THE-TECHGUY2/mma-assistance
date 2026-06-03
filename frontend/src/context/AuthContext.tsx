import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '../types';
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  LoginCredentials,
} from '../api/auth';
import { getToken, setToken, clearToken } from '../api/client';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const current = await apiMe();
      setUser(current);
    } catch {
      // Token invalid/expired — clear and treat as logged out.
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<User> => {
      const { token, user: loggedIn } = await apiLogin(credentials);
      setToken(token);
      setUser(loggedIn);
      return loggedIn;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiLogout();
    } catch {
      // Ignore network/server errors on logout; clear locally regardless.
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    await loadMe();
  }, [loadMe]);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    refresh,
    setCurrentUser: setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
