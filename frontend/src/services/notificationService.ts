import api from './api';

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

class NotificationService {
  async getAll(): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    const { data } = await api.get('/notifications');
    return data;
  }

  async markAsRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  }

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  }

  async deleteAll(): Promise<void> {
    await api.delete('/notifications');
  }
}

export const notificationService = new NotificationService();
