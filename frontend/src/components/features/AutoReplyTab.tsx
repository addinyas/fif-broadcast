'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Bot } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { autoReplyService, type AutoReplyRule } from '@/services/scheduleService';

const MATCH_LABEL: Record<string, string> = {
  contains: 'Mengandung kata',
  exact: 'Persis sama',
  starts_with: 'Dimulai dengan',
};

export default function AutoReplyTab() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AutoReplyRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ trigger: '', match_type: 'contains', reply_body: '', enabled: true });

  const loadRules = useCallback(async () => {
    try {
      const data = await autoReplyService.getAll();
      setRules(data);
    } catch {
      toast('error', 'Gagal memuat aturan auto-reply');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const openCreate = () => {
    setEditing(null);
    setForm({ trigger: '', match_type: 'contains', reply_body: '', enabled: true });
    setModalOpen(true);
  };

  const openEdit = (r: AutoReplyRule) => {
    setEditing(r);
    setForm({ trigger: r.trigger, match_type: r.match_type, reply_body: r.reply_body, enabled: r.enabled });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.trigger.trim() || !form.reply_body.trim()) {
      toast('error', 'Pemicu dan balasan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = { trigger: form.trigger.trim(), match_type: form.match_type, reply_body: form.reply_body.trim(), enabled: form.enabled };
      if (editing) {
        await autoReplyService.update(editing.id, payload);
        toast('success', 'Aturan berhasil diupdate');
      } else {
        await autoReplyService.create(payload);
        toast('success', 'Aturan berhasil ditambahkan');
      }
      setModalOpen(false);
      loadRules();
    } catch {
      toast('error', 'Gagal menyimpan aturan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus aturan ini?')) return;
    try {
      await autoReplyService.delete(id);
      toast('success', 'Aturan dihapus');
      loadRules();
    } catch {
      toast('error', 'Gagal menghapus aturan');
    }
  };

  const handleToggle = async (r: AutoReplyRule) => {
    try {
      await autoReplyService.update(r.id, { enabled: !r.enabled });
      loadRules();
    } catch {
      toast('error', 'Gagal mengubah status aturan');
    }
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fif-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Balasan otomatis saat customer mengirim pesan masuk. Berfungsi offline langsung dari worker.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-fif-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-fif-600/20 transition-all hover:bg-fif-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Aturan
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Bot className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada aturan auto-reply</p>
          <p className="mt-1 text-xs text-slate-400">Contoh: pemicu "STOP" → balasan konfirmasi berhenti menerima broadcast.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800/90">
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {rules.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-fif-50 px-2 py-0.5 text-xs font-bold text-fif-700 dark:bg-fif-500/10 dark:text-fif-400">
                      {MATCH_LABEL[r.match_type]}: "{r.trigger}"
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400" title={r.reply_body}>
                    → {r.reply_body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(r)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${r.enabled ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${r.enabled ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                </button>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(r)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-fif-600 dark:hover:bg-slate-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(r.id)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Aturan' : 'Tambah Aturan Auto-Reply'}>
        <div className="space-y-4">
          <Select
            label="Metode Pencocokan"
            options={Object.entries(MATCH_LABEL).map(([value, label]) => ({ value, label }))}
            value={form.match_type}
            onChange={(e) => setForm((prev) => ({ ...prev, match_type: e.target.value }))}
          />
          <Input
            label="Pemicu"
            value={form.trigger}
            onChange={(e) => setForm((prev) => ({ ...prev, trigger: e.target.value }))}
            placeholder={form.match_type === 'exact' ? 'STOP' : form.match_type === 'starts_with' ? 'sudah lunas' : 'lunas'}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Balasan Otomatis</label>
            <textarea
              value={form.reply_body}
              onChange={(e) => setForm((prev) => ({ ...prev, reply_body: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Terima kasih, Anda tidak akan menerima broadcast lagi."
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif</p>
              <p className="text-xs text-slate-400">Aturan hanya dipakai jika aktif</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${form.enabled ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.enabled ? 'translate-x-[22px]' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-fif-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-fif-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
