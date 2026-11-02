'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

export interface SuperadminProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isSuperadmin: boolean;
  isActive: boolean;
}

interface AuthContextType {
  user: SuperadminProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  refreshData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SuperadminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<SuperadminProfile>('/users/me');
      if (res.success && res.data) {
        if (!res.data.isSuperadmin) {
          api.clearTokens();
          setUser(null);
          alert('Acesso negado: Sua conta não possui privilégios de Superadmin.');
        } else {
          setUser(res.data);
        }
      } else {
        api.clearTokens();
        setUser(null);
      }
    } catch {
      api.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const res = await api.post<{
      user: SuperadminProfile;
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/login', { email, password });

    if (res.success && res.data) {
      if (!res.data.user.isSuperadmin) {
        setLoading(false);
        return {
          success: false,
          error: 'Acesso negado: Usuário não possui credencial de Superadmin.',
        };
      }

      api.setToken(res.data.tokens.accessToken);
      if (res.data.tokens.refreshToken) {
        api.setRefreshToken(res.data.tokens.refreshToken);
      }
      setUser(res.data.user);
      setLoading(false);
      return { success: true };
    }

    setLoading(false);
    return { success: false, error: res.error || 'Credenciais inválidas.' };
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshData: fetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
