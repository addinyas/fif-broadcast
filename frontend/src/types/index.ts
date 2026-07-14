export type UserRole = 'superadmin' | 'UH' | 'marketing';

export interface User {
  id: number;
  name: string;
  display_name?: string | null;
  broadcast_sender_name?: string;
  email: string;
  avatar?: string;
  avatar_url?: string;
  role: UserRole;
  gender?: string | null;
  npo_mce_id?: string | null;
  kios_name?: string | null;
  kios_id?: string | null;
  created_at?: string;
  whatsapp_connection?: string;
  last_connected_at?: string | null;
  last_broadcast_at?: string | null;
}

export interface Kios {
  id: number;
  kios_id: string;
  kios_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Customer {
  id: number;
  no_contract: string | null;
  name: string;
  phone_number: string;
  uploaded_by: number;
  marketing_id: number | null;
  assignment_status: 'unassigned' | 'assigned';
  dynamic_data: Record<string, string> | null;
  manual_sent_at: string | null;
  created_at: string;
  updated_at: string;
  uploader?: User;
  marketing?: User;
  broadcast_histories?: BroadcastHistory[];
  from_marketing_name?: string;
  from_marketing_id?: number;
  share_group?: string;
}

export interface Template {
  id: number;
  title: string;
  message_body: string;
  is_default?: boolean;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  creator?: User;
}

export interface BroadcastHistory {
  id: number;
  customer_id: number;
  marketing_id: number;
  exact_message: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  error_log?: string;
  sent_at?: string;
  created_at?: string;
  customer?: Customer;
  marketing?: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface BroadcastStats {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

export interface MarketingSummary {
  assigned_count: number;
  broadcast: BroadcastStats;
  not_broadcast_count: number;
  shared_data: {
    total_shared: number;
    owners: string[];
  };
  last_broadcast: {
    customer_name: string;
    status: string;
    sent_at: string | null;
    created_at: string;
  } | null;
  recent: Array<{
    id: number;
    customer_name: string;
    status: string;
    sent_at: string | null;
    created_at: string;
  }>;
}

export interface DistributionReport {
  total_customers: number;
  assigned: number;
  unassigned: number;
  by_marketing: {
    marketing_id: number;
    total: number;
    marketing: { id: number; name: string };
    total_broadcasts: number;
    sent: number;
    failed: number;
    pending: number;
    processing: number;
  }[];
}

export interface ShareInfo {
  total: number;
  broadcast_count: number;
  pending_count: number;
}

export interface CustomerShareRequest {
  id: number;
  from_marketing: User;
  requested_by: User;
  count: number;
  share_type: string;
  created_at: string;
  share_ids: number[];
}

export const FORM_FIELDS = [
  { key: 'nomor_contract', label: 'Nomor Contract' },
  { key: 'no_contract', label: 'No Contract' },
  { key: 'nama', label: 'Nama' },
  { key: 'namapanggilanakun', label: 'Nama Panggilan' },
  { key: 'motor_dan_tahun', label: 'Motor dan Tahun' },
  { key: 'plat', label: 'Plat' },
  { key: 'obj_desc', label: 'Obj Desc' },
  { key: 'tahun', label: 'Tahun' },
  { key: 'plafon', label: 'Plafon' },
  { key: 'angsuran_kurang', label: 'Angsuran Kurang' },
  { key: 'input_angsuran', label: 'Input Angsuran' },
  { key: 'dinego_jadi', label: 'Dinego Jadi' },
  { key: 'pinjaman', label: 'Pinjaman' },
  { key: 'pelunasan', label: 'Pelunasan' },
  { key: 'terima', label: 'Terima' },
  { key: 'tenor', label: 'Tenor' },
  { key: 'sisa_angsuran', label: 'Sisa Angsuran' },
] as const;
