import api from './api';
import type { Customer, PaginatedResponse, DistributionReport } from '../types';

export const customerService = {
  async getAll(params?: Record<string, string>): Promise<PaginatedResponse<Customer>> {
    const { data } = await api.get('/customers', { params });
    return data;
  },

  async getById(id: number): Promise<Customer> {
    const { data } = await api.get(`/customers/${id}`);
    return data;
  },

  async create(payload: Partial<Customer>): Promise<Customer> {
    const { data } = await api.post('/customers', payload);
    return data;
  },

  async update(id: number, payload: Partial<Customer>): Promise<Customer> {
    const { data } = await api.put(`/customers/${id}`, payload);
    return data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  async bulkImport(customers: Record<string, unknown>[]): Promise<{ imported: number; failed: unknown[] }> {
    const { data } = await api.post('/customers/import', { customers });
    return data;
  },

  async importFile(file: File): Promise<{ imported: number; failed: unknown[] }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/customers/import-file', form);
    return data;
  },

  async importSpreadsheet(url: string): Promise<{ imported: number; failed: unknown[] }> {
    const { data } = await api.post('/customers/import-spreadsheet', { spreadsheet_url: url });
    return data;
  },

  async getAssignedToMe(params?: Record<string, string>): Promise<PaginatedResponse<Customer>> {
    const { data } = await api.get('/customers/assigned-to-me', { params });
    return data;
  },

  async assign(customerIds: number[], marketingId: number): Promise<unknown> {
    const { data } = await api.post('/assignments/assign', { customer_ids: customerIds, marketing_id: marketingId });
    return data;
  },

  async unassign(customerIds: number[]): Promise<unknown> {
    const { data } = await api.post('/assignments/unassign', { customer_ids: customerIds });
    return data;
  },

  async getDistribution(): Promise<DistributionReport> {
    const { data } = await api.get('/assignments/distribution');
    return data;
  },

  async getAllIds(): Promise<{ ids: number[]; total: number }> {
    const { data } = await api.get('/customers/all-ids');
    return data;
  },

  async deleteAll(): Promise<{ message: string }> {
    const { data } = await api.delete('/customers');
    return data;
  },

  async updateCori(id: number, cori: string): Promise<Customer> {
    const { data } = await api.patch(`/customers/${id}/cori`, { cori });
    return data;
  },

  async batchDelete(ids: number[]): Promise<{ message: string }> {
    const { data } = await api.post('/customers/batch-delete', { ids });
    return data;
  },

  async getMarketingUsers(): Promise<{ id: number; name: string; email: string }[]> {
    const { data } = await api.get('/admin/marketing-users');
    return data;
  },

  async marketingAdd(payload: { name: string; phone_number: string; dynamic_data?: Record<string, string> }): Promise<Customer> {
    const { data } = await api.post('/customers/marketing-add', payload);
    return data;
  },

  async deleteManual(id: number): Promise<void> {
    await api.delete(`/customers/${id}/manual-entry`);
  },

  async getByNoContract(noContract: string): Promise<Customer> {
    const { data } = await api.get(`/customers/by-no-contract/${encodeURIComponent(noContract)}`);
    return data;
  },

  async assignByUnit(marketingId: number, nmcCount: number, refiCount: number): Promise<{ assigned: unknown[]; total: number }> {
    const { data } = await api.post('/assignments/assign-by-unit', {
      marketing_id: marketingId,
      nmc_count: nmcCount,
      refi_count: refiCount,
    });
    return data;
  },

  async searchCalculator(q: string): Promise<Customer[]> {
    const { data } = await api.get('/customers/search-calculator', { params: { q } });
    return data;
  },

  async markSent(id: number): Promise<void> {
    await api.post(`/customers/mark-sent/${id}`);
  },

  async getSentIds(): Promise<number[]> {
    const { data } = await api.get('/customers/sent-ids');
    return data.ids;
  },

  async clearSentMarks(): Promise<void> {
    await api.delete('/customers/sent-marks');
  },

  async getAutoCalculate(): Promise<{
    total_nmc: number;
    total_refi: number;
    unassigned_marketing_count: number;
    nmc_per_marketing: number;
    refi_per_marketing: number;
  }> {
    const { data } = await api.get('/assignments/auto-calculate');
    return data;
  },
};
