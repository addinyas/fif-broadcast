import api from './api';
import type { AuthResponse, User, Kios } from '../types';

export const authService = {
  async login(npoMceId: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', { npo_mce_id: npoMceId, password });
    return data;
  },

  async register(payload: {
    name: string;
    email?: string;
    password: string;
    gender: string;
    npo_mce_id: string;
    kios_id: string;
  }): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getKios(): Promise<Kios[]> {
    const { data } = await api.get('/kios');
    return data.data;
  },
};
