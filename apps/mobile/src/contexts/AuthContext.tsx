import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User, AuthTokens } from '@meal-planning/shared-types';
import { api } from '../api/client';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: User }>('/users/me');
      setUser(response.data);
      await storage.setUser(response.data);
    } catch {
      await api.clearAuth();
      await storage.clearUser();
      setUser(null);
    }
  }, []);

  // Initialize auth state on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const tokens = await storage.getTokens();
        if (tokens) {
          api.setAccessToken(tokens.access_token);
          await fetchUser();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post<{
      success: boolean;
      data: { user: User; tokens: AuthTokens };
    }>('/auth/login', { email, password });

    const { user: userData, tokens } = response.data;
    await storage.setTokens(tokens);
    await storage.setUser(userData);
    api.setAccessToken(tokens.access_token);
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.post<{
      success: boolean;
      data: { user: User; tokens: AuthTokens };
    }>('/auth/register', { email, password, name });

    const { user: userData, tokens } = response.data;
    await storage.setTokens(tokens);
    await storage.setUser(userData);
    api.setAccessToken(tokens.access_token);
    setUser(userData);
  };

  const logout = async () => {
    await api.clearAuth();
    await storage.clearAll();
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
