import api from './api';

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string; role: string } | null;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  current_page: number;
  last_page: number;
  total: number;
}

export const auditService = {
  async getLogs(params?: Record<string, string>): Promise<PaginatedAuditLogs> {
    const { data } = await api.get('/admin/audit-logs', { params });
    return data;
  },
};
