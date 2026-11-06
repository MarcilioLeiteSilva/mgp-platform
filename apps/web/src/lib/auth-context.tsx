'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  defaultOrganizationId: string | null;
  activeSessionsCount?: number;
  organizations?: Array<{
    organizationId: string;
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      isPersonal: boolean;
    };
  }>;
}

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  role: string;
  isDefault?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  organizations: OrganizationItem[];
  currentOrg: OrganizationItem | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  organizations: [],
  currentOrg: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  switchOrganization: () => {},
  refreshData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrganizationItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    try {
      const [userRes, orgsRes] = await Promise.all([
        api.get<UserProfile>('/users/me'),
        api.get<any[]>('/organizations/me'),
      ]);

      if (userRes.success && userRes.data) {
        setUser(userRes.data);

        const rawOrgs = orgsRes.success && Array.isArray(orgsRes.data) ? orgsRes.data : [];
        const orgList: OrganizationItem[] = rawOrgs.map((item: any) => {
          if (item.organization) {
            return {
              id: item.organization.id,
              name: item.organization.name,
              slug: item.organization.slug,
              role: item.role,
              isDefault: item.isDefault,
            };
          }
          return item;
        });

        // Fallback: extrair das memberships do perfil se necessário
        if (orgList.length === 0 && (userRes.data as any)?.memberships) {
          (userRes.data as any).memberships.forEach((m: any) => {
            if (m.organization) {
              orgList.push({
                id: m.organization.id,
                name: m.organization.name,
                slug: m.organization.slug,
                role: m.role,
                isDefault: m.isDefault,
              });
            }
          });
        }

        setOrganizations(orgList);

        const storedOrgId = api.getActiveOrgId();
        let active = orgList.find((o) => o.id === storedOrgId);

        if (!active && userRes.data.defaultOrganizationId) {
          active = orgList.find((o) => o.id === userRes.data.defaultOrganizationId);
        }

        if (!active && orgList.length > 0) {
          active = orgList.find((o) => o.isDefault) || orgList[0];
        }

        if (active) {
          setCurrentOrg(active);
          api.setActiveOrgId(active.id);
        }
      } else {
        // Token inválido ou expirado
        api.clearTokens();
        setUser(null);
        setOrganizations([]);
        setCurrentOrg(null);
      }
    } catch {
      api.clearTokens();
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
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
      user: UserProfile;
      organization?: { id: string; name: string; slug: string; role: string };
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/login', { email, password });

    if (res.success && res.data) {
      api.setToken(res.data.tokens.accessToken);
      if (res.data.tokens.refreshToken) {
        api.setRefreshToken(res.data.tokens.refreshToken);
      }
      if (res.data.organization?.id) {
        api.setActiveOrgId(res.data.organization.id);
        setCurrentOrg({
          id: res.data.organization.id,
          name: res.data.organization.name,
          slug: res.data.organization.slug,
          role: res.data.organization.role,
        });
      }
      setUser(res.data.user);
      await fetchUserData();
      return { success: true };
    }

    setLoading(false);
    return { success: false, error: res.error || 'Credenciais inválidas' };
  };

  const register = async (payload: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }) => {
    setLoading(true);
    const res = await api.post<{
      user: UserProfile;
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/register', payload);

    if (res.success && res.data) {
      api.setToken(res.data.tokens.accessToken);
      if (res.data.tokens.refreshToken) {
        api.setRefreshToken(res.data.tokens.refreshToken);
      }
      await fetchUserData();
      return { success: true };
    }

    setLoading(false);
    return { success: false, error: res.error || 'Erro ao registrar usuário' };
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      api.setActiveOrgId(org.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        loading,
        login,
        register,
        logout,
        switchOrganization,
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

