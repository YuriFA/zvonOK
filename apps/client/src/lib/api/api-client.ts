import {
  ApiError,
  AuthError,
  NetworkError,
  ValidationError,
} from './api.errors';

const API_BASE_URL = (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      let response = await fetch(url, config);

      // Handle 401 - try refreshing token
      if (response.status === 401 && !endpoint.includes('/auth/refresh-token')) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request after successful refresh
          response = await fetch(url, config);
        } else {
          // Refresh failed - clear auth state and let the error propagate
          throw new AuthError('Session expired. Please login again.', 401);
        }
      }

      if (!response.ok) {
        await this.handleError(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof ApiError || error instanceof AuthError) {
        throw error;
      }
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network error occurred',
      );
    }
  }

  private async handleError(response: Response): Promise<never> {
    let details: unknown;

    try {
      details = await response.json();
    } catch {
      // Response body is empty or not JSON
    }

    const message = this.extractErrorMessage(details);

    switch (response.status) {
      case 400:
        throw new ValidationError(message, details);
      case 401:
        throw new AuthError(message, 401, details);
      case 403:
        throw new ApiError(message, 403, details);
      case 404:
        throw new ApiError(message, 404, details);
      case 409:
        throw new ApiError(message, 409, details);
      case 422:
        throw new ValidationError(message, details);
      case 500:
        throw new ApiError('Internal server error', 500, details);
      default:
        throw new ApiError(message, response.status, details);
    }
  }

  private extractErrorMessage(details: unknown): string {
    if (typeof details === 'string') {
      return details;
    }

    if (details && typeof details === 'object' && 'message' in details) {
      return String(details.message);
    }

    if (details && typeof details === 'object' && 'error' in details) {
      return String(details.error);
    }

    return 'An error occurred';
  }

  private async refreshAccessToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise ?? Promise.resolve(false);
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      await this.refreshPromise;
      return true;
    } catch {
      return false;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<void> {
    const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new AuthError('Failed to refresh token', response.status);
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
