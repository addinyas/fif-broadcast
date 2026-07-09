import api from './api';
import type { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async register(payload: {
    name: string;
    email: string;
    password: string;
    gender: string;
    npo_mce_id: string;
    kios_name: string;
    kios_id: string;
  }): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', payload);
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
