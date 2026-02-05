import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// Use localhost for iOS simulator, 10.0.2.2 for Android emulator
const getBaseUrl = () => {
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:8000/api/v1'
      : 'http://localhost:8000/api/v1';
  }
  // Production URL - update this when deploying
  return 'https://api.yourapp.com/api/v1';
};

const API_URL = getBaseUrl();

export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, unknown>;
}

class ApiClient {
  private accessToken: string | null = null;

  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const url = new URL(`${API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try to get token from memory first, then from storage
    if (!this.accessToken) {
      const tokens = await storage.getTokens();
      if (tokens) {
        this.accessToken = tokens.access_token;
      }
    }

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const headers = await this.getHeaders();

    const fetchOptions: RequestInit = {
      method: options.method,
      headers: { ...headers, ...options.headers },
    };

    if (options.body && options.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let response = await fetch(url, fetchOptions);

    // Handle 401 - try to refresh token
    if (response.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        const retryHeaders = await this.getHeaders();
        fetchOptions.headers = { ...retryHeaders, ...options.headers };
        response = await fetch(url, fetchOptions);
      } else {
        // Refresh failed - clear tokens
        await this.clearAuth();
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `HTTP ${response.status}`);
      (error as any).response = { status: response.status, data: errorData };
      throw error;
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const tokens = await storage.getTokens();
      if (!tokens?.refresh_token) return false;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: tokens.refresh_token,
        }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      const newTokens = data.data;
      await storage.setTokens(newTokens);
      this.accessToken = newTokens.access_token;
      return true;
    } catch {
      return false;
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  async clearAuth() {
    this.accessToken = null;
    await storage.clearTokens();
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
