'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, FileText, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { templateService } from '@/services/templateService';
import { useAuth } from '@/context/AuthContext';
import type { Template } from '@/types';

const VARIABLE_BUTTONS = [
  { key: '#no_contract', label: 'No Contract' },
  { key: '#nama', label: 'Nama Customer' },
  { key: '#nomor', label: 'Nomor Kamu' },
  { key: '#namapanggilan', label: 'Nama Kamu' },
  { key: '#obj_desc', label: 'Tipe Motor' },
  { key: '#tahun', label: 'Tahun Motor' },
  { key: '#plafon', label: 'Plafon' },
  { key: '#sisa_angsuran', label: 'Sisa Angsuran' },
  { key: '#waktu', label: 'Waktu' },
];

export default function TemplateTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', message_body: '', is_default: false });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await templateService.getAll());
    } catch {
      toast('error', 'Gagal memuat template');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const insertVariable = (variable: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setForm((prev) => ({ ...prev, message_body: prev.message_body + variable }));
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = form.message_body.substring(0, start) + variable + form.message_body.substring(end);
    setForm((prev) => ({ ...prev, message_body: newVal }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + variable.length;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', message_body: '', is_default: false });
    setModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ title: t.title, message_body: t.message_body, is_default: t.is_default ?? false });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message_body.trim()) {
      toast('error', 'Judul dan isi pesan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), message_body: form.message_body.trim() };
      if (editing) {
        await templateService.update(editing.id, { ...payload, is_default: form.is_default });
        toast('success', 'Template berhasil diupdate');
      } else {
        await templateService.create({ ...payload, is_default: form.is_default });
        toast('success', 'Template berhasil ditambahkan');
      }
      setModalOpen(false);
      loadTemplates();
    } catch {
      toast('error', 'Gagal menyimpan template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Hapus template "${t.title}"?`)) return;
    try {
      await templateService.delete(t.id);
      toast('success', 'Template dihapus');
      loadTemplates();
    } catch {
      toast('error', 'Gagal menghapus template');
    }
  };

  const canEdit = (t: Template) => isSuperadmin || !t.is_default;
  const canDelete = (t: Template) => isSuperadmin || !t.is_default;

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fif-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih minimal 3 template untuk jadwal broadcast agar pesan bervariasi dan terhindar dari deteksi spam.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-fif-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-fif-600/20 transition-all hover:bg-fif-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada template</p>
          <p className="mt-1 text-xs text-slate-400">Klik "Tambah Template" untuk membuat variasi pesan broadcast.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800/90">
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.is_default ? 'bg-fif-50 text-fif-600 dark:bg-fif-500/10 dark:text-fif-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{t.title}</p>
                    {t.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-fif-100 px-2 py-0.5 text-[10px] font-bold text-fif-700 dark:bg-fif-500/10 dark:text-fif-400">
                        <Shield className="h-3 w-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400" title={t.message_body}>{t.message_body}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => canEdit(t) && openEdit(t)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-fif-600 dark:hover:bg-slate-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => canDelete(t) && handleDelete(t)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'Tambah Template'} size="lg">
        <div className="space-y-4">
          <Input
            label="Judul Template"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Mis: Tagihan 1"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Isi Pesan</label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_BUTTONS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-fif-50 px-2.5 py-1 text-xs font-medium text-fif-600 transition-colors hover:bg-fif-100 active:scale-95 dark:bg-fif-900/20 dark:text-fif-400 dark:hover:bg-fif-900/30"
                >
                  {v.label}
                </button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={form.message_body}
              onChange={(e) => setForm({ ...form, message_body: e.target.value })}
              placeholder="Tulis isi pesan di sini..."
              rows={6}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          {isSuperadmin && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Jadikan Template Default</p>
                <p className="text-xs text-slate-400">Terlihat dan bisa dipakai semua role</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, is_default: !prev.is_default }))}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${form.is_default ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.is_default ? 'translate-x-[22px]' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
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
