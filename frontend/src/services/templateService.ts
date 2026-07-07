import api from './api';
import type { Template } from '../types';

export const templateService = {
  async getAll(): Promise<Template[]> {
    const { data } = await api.get('/templates');
    return data;
  },

  async getById(id: number): Promise<Template> {
    const { data } = await api.get(`/templates/${id}`);
    return data;
  },

  async create(payload: Partial<Template>): Promise<Template> {
    const { data } = await api.post('/templates', payload);
    return data;
  },

  async update(id: number, payload: Partial<Template>): Promise<Template> {
    const { data } = await api.put(`/templates/${id}`, payload);
    return data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/templates/${id}`);
  },
};
