import api from './api';

export interface PermissionItem {
  id: number;
  feature: string;
  enabled: boolean;
}

export type PermissionsByRole = Record<string, PermissionItem[]>;

export const permissionService = {
  async getAll(): Promise<PermissionsByRole> {
    const { data } = await api.get('/admin/permissions');
    return data;
  },

  async update(permissions: { id: number; enabled: boolean }[]): Promise<void> {
    await api.put('/admin/permissions', { permissions });
  },
};

export const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customer_management: 'Customer Management',
  template_management: 'Template Management',
  user_management: 'User Management',
  prospect_list: 'Broadcast',
  broadcast: 'Broadcast',
  broadcast_history: 'Broadcast History',
  qr_scanner: 'QR Scanner',
  broadcast_stats: 'Broadcast Stats',
};
