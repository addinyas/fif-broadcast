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

  async bulkImport(customers: Record<string, unknown>[]): Promise<{ imported: number; failed: { row: number; error: string }[] }> {
    const { data } = await api.post('/customers/import', { customers });
    return data;
  },

  async importFile(file: File): Promise<{ imported: number; failed: { row: number; error: string }[] }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/customers/import-file', form);
    return data;
  },

  async importSpreadsheet(url: string): Promise<{ imported: number; failed: { row: number; error: string }[] }> {
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
    const { data } = await api.post('/customers/delete-all', { confirm: 'DELETE_ALL' });
    return data;
  },

  async deleteAllByKios(kiosId: string): Promise<{ message: string }> {
    const { data } = await api.post('/customers/delete-all', { confirm: 'DELETE_ALL', kios_id: kiosId });
    return data;
  },

  async deleteMyData(): Promise<{ message: string }> {
    const { data } = await api.post('/customers/delete-my-data', { confirm: 'DELETE_MY_DATA' });
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

  async getMarketingUsers(kiosId?: string): Promise<{ id: number; name: string; email: string }[]> {
    const params: Record<string, string> = {};
    if (kiosId) params.kios_id = kiosId;
    const { data } = await api.get('/admin/marketing-users', { params });
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

  async downloadTemplate(): Promise<void> {
    const response = await api.get('/customers/template-download', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_customer.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async getShareInfo(marketingId: number): Promise<{ total: number; broadcast_count: number; pending_count: number }> {
    const { data } = await api.get(`/customer-shares/info/${marketingId}`);
    return data;
  },

  async requestShare(fromMarketingId: number, count: number, shareType: string): Promise<{ message: string; total: number }> {
    const { data } = await api.post('/customer-shares/request', {
      from_marketing_id: fromMarketingId,
      count,
      share_type: shareType,
    });
    return data;
  },

  async getPendingShares(): Promise<import('../types').CustomerShareRequest[]> {
    const { data } = await api.get('/customer-shares/pending');
    return data;
  },

  async approveShare(id: number): Promise<{ message: string }> {
    const { data } = await api.post(`/customer-shares/${id}/approve`);
    return data;
  },

  async revokeShare(id: number): Promise<{ message: string }> {
    const { data } = await api.post(`/customer-shares/${id}/revoke`);
    return data;
  },

  async getMySharedCustomers(): Promise<Customer[]> {
    const { data } = await api.get('/customer-shares/my-shared');
    return data;
  },

  async getOrphanStats(): Promise<{ total_orphans: number; details: { kios_id: string | null; kios_name: string; count: number }[] }> {
    const { data } = await api.get('/customers/orphan-stats');
    return data;
  },

  async deleteOrphan(kiosId?: string): Promise<{ message: string }> {
    const payload: Record<string, string> = { confirm: 'DELETE_ORPHAN' };
    if (kiosId) payload.kios_id = kiosId;
    const { data } = await api.post('/customers/delete-orphan', payload);
    return data;
  },

  async getBroadcastMarks(customerId: number): Promise<{ sent_marks: { user_id: number; user_name: string; role: string; sent_at: string }[]; broadcasts: { user_id: number; user_name: string; role: string; status: string; sent_at: string | null; created_at: string }[] }> {
    const { data } = await api.get(`/customers/${customerId}/broadcast-marks`);
    return data;
  },
};
