export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

class AdminApiClient {
  private getStorageItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  private removeStorageItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  getToken(): string | null {
    return this.getStorageItem('mgp_admin_token');
  }

  setToken(token: string): void {
    this.setStorageItem('mgp_admin_token', token);
  }

  getRefreshToken(): string | null {
    return this.getStorageItem('mgp_admin_refresh_token');
  }

  setRefreshToken(token: string): void {
    this.setStorageItem('mgp_admin_refresh_token', token);
  }

  clearTokens(): void {
    this.removeStorageItem('mgp_admin_token');
    this.removeStorageItem('mgp_admin_refresh_token');
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Se der 401 e tiver refresh token, tentar renovar
      if (response.status === 401 && this.getRefreshToken() && !endpoint.includes('/auth/refresh')) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return await retryResponse.json();
        }
      }

      const json = await response.json();
      if (!response.ok) {
        throw new Error(
          (Array.isArray(json.message) ? json.message.join(', ') : json.message) ||
          json.error ||
          `Erro na requisição (${response.status})`
        );
      }
      return json;
    } catch (err: any) {
      return {
        success: false,
        data: null as any,
        error: err.message || 'Erro inesperado de rede',
      };
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        return false;
      }

      const data = await res.json();
      if (data?.data?.accessToken) {
        this.setToken(data.data.accessToken);
        if (data.data.refreshToken) {
          this.setRefreshToken(data.data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  get<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new AdminApiClient();
