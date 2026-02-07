import { apiClient } from '@/lib/api/api-client';
import type { AuthResponse, User } from '../types/auth.types';

export class AuthApi {
  private readonly client = apiClient;

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/login', { email, password });
  }

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/register', {
      username,
      email,
      password,
    });
  }

  async logout(): Promise<void> {
    return this.client.post<void>('/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    return this.client.get<User>('/auth/me');
  }
}

// Singleton instance
export const authApi = new AuthApi();
