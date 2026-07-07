import api from './api';
import type { BroadcastHistory, PaginatedResponse, BroadcastStats, MarketingSummary } from '../types';

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
};
