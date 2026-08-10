import api from './api';
import type { Template } from '@/types';

export interface BroadcastSchedule {
  id: number;
  user_id: number;
  schedule_time: string;
  days_active: string[];
  template_body: string | null;
  template_ids: number[] | null;
  active: boolean;
  last_run_date: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: number; name: string; kios_name: string | null };
}

export interface NotifSettings {
  notif_disconnect_enabled: { label: string; type: string; value: string | null };
  notif_disconnect_level: { label: string; type: string; value: string | null };
}

export const scheduleService = {
  async getAll(): Promise<BroadcastSchedule[]> {
    const { data } = await api.get('/broadcast-schedules');
    return data.data;
  },

  async create(payload: { schedule_time: string; days_active: string[]; template_ids: number[]; active: boolean; user_id?: number }): Promise<BroadcastSchedule> {
    const { data } = await api.post('/broadcast-schedules', payload);
    return data.data;
  },

  async update(id: number, payload: Partial<{ schedule_time: string; days_active: string[]; template_ids: number[]; active: boolean }>): Promise<BroadcastSchedule> {
    const { data } = await api.put(`/broadcast-schedules/${id}`, payload);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/broadcast-schedules/${id}`);
  },

  async getNotifSettings(): Promise<NotifSettings> {
    const { data } = await api.get('/broadcast-schedules/notif-settings');
    return data.data;
  },

  async updateNotifSettings(payload: Partial<{ notif_disconnect_enabled: boolean; notif_disconnect_level: string }>): Promise<void> {
    await api.put('/broadcast-schedules/notif-settings', payload);
  },
};

export { Template };

export interface AutoReplyRule {
  id: number;
  user_id: number | null;
  trigger: string;
  match_type: 'contains' | 'exact' | 'starts_with';
  reply_body: string;
  enabled: boolean;
  sort_order: number;
}

export const autoReplyService = {
  async getAll(): Promise<AutoReplyRule[]> {
    const { data } = await api.get('/auto-reply-rules');
    return data.data;
  },

  async create(payload: { trigger: string; match_type: string; reply_body: string; enabled: boolean }): Promise<AutoReplyRule> {
    const { data } = await api.post('/auto-reply-rules', payload);
    return data.data;
  },

  async update(id: number, payload: Partial<{ trigger: string; match_type: string; reply_body: string; enabled: boolean; sort_order: number }>): Promise<AutoReplyRule> {
    const { data } = await api.put(`/auto-reply-rules/${id}`, payload);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/auto-reply-rules/${id}`);
  },
};
