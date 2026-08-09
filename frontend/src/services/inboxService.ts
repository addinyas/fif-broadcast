import api from './api';

export interface InboxConversation {
  id: number;
  user_id: number;
  remote_jid: string;
  contact_name: string | null;
  contact_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  inbound_count: number;
  drive_url?: string | null;
}

export interface InboxMessage {
  id: number;
  conversation_id: number;
  direction: 'inbound' | 'outbound';
  body: string;
  wa_message_id: string | null;
  is_read: boolean;
  status: 'sent' | 'failed' | 'pending';
  created_at: string;
}

export const inboxService = {
  async getConversations(): Promise<InboxConversation[]> {
    const { data } = await api.get('/inbox/conversations');
    return data.data;
  },

  async getConversation(id: number): Promise<{ data: { id: number; remote_jid: string; contact_name: string | null; contact_phone: string | null; drive_url?: string | null }; messages: InboxMessage[] }> {
    const { data } = await api.get(`/inbox/conversations/${id}`);
    return data;
  },

  async saveToDrive(id: number, image: string): Promise<string> {
    const { data } = await api.post(`/inbox/conversations/${id}/drive-screenshot`, { image });
    return data.data.drive_url;
  },

  async reply(id: number, body: string): Promise<InboxMessage> {
    const { data } = await api.post(`/inbox/conversations/${id}/reply`, { body });
    return data.data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get('/inbox/unread-count');
    return data.data.unread;
  },
};
