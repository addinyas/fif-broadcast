import api from './api';
import type { BroadcastHistory, PaginatedResponse, BroadcastStats, BroadcastProgress, MarketingSummary, WorkerStatus } from '../types';

export const broadcastService = {
  async prepare(customerId: number, templateBody: string, formValues: Record<string, string>): Promise<BroadcastHistory> {
    const { data } = await api.post('/broadcast/prepare', {
      customer_id: customerId,
      template_body: templateBody,
      form_values: formValues,
    });
    return data;
  },

  async getHistory(params?: Record<string, string>): Promise<PaginatedResponse<BroadcastHistory>> {
    const { data } = await api.get('/broadcast/history', { params });
    return data;
  },

  async getStats(): Promise<BroadcastStats> {
    const { data } = await api.get('/broadcast/stats');
    return data;
  },

  async getMarketingSummary(): Promise<MarketingSummary> {
    const { data } = await api.get('/broadcast/marketing-summary');
    return data;
  },

  async getProgress(): Promise<BroadcastProgress> {
    const { data } = await api.get('/broadcast/progress');
    return data;
  },

  async cancelPending(): Promise<{ cancelled: number }> {
    const { data } = await api.post('/broadcast/cancel');
    return data;
  },

  async getWorkerStatus(): Promise<WorkerStatus> {
    const { data } = await api.get('/broadcast/worker-status');
    return data;
  },

  async cancelItem(id: number): Promise<{ message: string }> {
    const { data } = await api.post('/broadcast/cancel-item', { id });
    return data;
  },
};
