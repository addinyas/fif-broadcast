import api from './api';
import type { User } from '../types';

export interface ProfileResponse {
  data: User;
}

export interface ClearCacheResponse {
  message: string;
  details: string[];
  errors: string[];
}

export const profileService = {
  async getProfile(): Promise<ProfileResponse> {
    const { data } = await api.get<ProfileResponse>('/profile');
    return data;
  },

  async updateProfile(payload: {
    name?: string;
    gender?: string | null;
    npo_mce_id?: string | null;
    display_name?: string | null;
  }): Promise<{ message: string; data: User }> {
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    );
    const { data } = await api.put<{ message: string; data: User }>('/profile', clean);
    return data;
  },

  async uploadAvatar(file: File): Promise<{ message: string; avatar_url: string }> {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await api.post<{ message: string; avatar_url: string }>('/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteAvatar(): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>('/profile/avatar');
    return data;
  },

  async changePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    const { data } = await api.put<{ message: string }>('/profile/password', payload);
    return data;
  },

  async clearCache(): Promise<ClearCacheResponse> {
    const { data } = await api.post<ClearCacheResponse>('/profile/clear-cache');
    return data;
  },
};
