import api from './api';
import type { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  },

  async googleRedirect(): Promise<{ url: string }> {
    const { data } = await api.post('/auth/google/redirect');
    return data;
  },

  async googleCallback(code: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/google/callback', { code });
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
