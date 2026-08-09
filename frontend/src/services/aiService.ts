import api from './api';

export interface AiTestResult {
  ok: boolean;
  url: string;
  model: string;
  models?: string[];
  error?: string;
}

export interface AiSettings {
  ai_ollama_url: { label: string; type: string; value: string | null; placeholder?: string };
  ai_ollama_model: { label: string; type: string; value: string | null; placeholder?: string };
  ai_auto_reply_enabled: { label: string; type: string; value: string | null };
  ai_classify_enabled: { label: string; type: string; value: string | null };
}

export const aiService = {
  async getSettings(): Promise<AiSettings> {
    const { data } = await api.get('/admin/broadcast-settings');
    return data.data;
  },

  async updateSettings(payload: Partial<{
    ai_ollama_url: string;
    ai_ollama_model: string;
    ai_auto_reply_enabled: boolean;
    ai_classify_enabled: boolean;
  }>): Promise<void> {
    await api.put('/admin/broadcast-settings', payload);
  },

  async test(): Promise<AiTestResult> {
    const { data } = await api.post('/ai/test');
    return data.data;
  },

  async classify(text: string): Promise<{ score: number | null; raw: string }> {
    const { data } = await api.post('/ai/classify', { text });
    return data.data;
  },

  async suggestReply(text: string, context?: string): Promise<string> {
    const { data } = await api.post('/ai/suggest-reply', { text, context });
    return data.data;
  },
};
