'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Plus, Pencil, Trash2, AlarmClock, UserRound, Clock, Bot, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { scheduleService, type BroadcastSchedule } from '@/services/scheduleService';
import { customerService } from '@/services/customerService';
import { templateService } from '@/services/templateService';
import AutoReplyTab from './AutoReplyTab';
import TemplateTab from './TemplateTab';

const DAY_OPTIONS = [
  { value: 'Mon', label: 'Senin' },
  { value: 'Tue', label: 'Selasa' },
  { value: 'Wed', label: 'Rabu' },
  { value: 'Thu', label: 'Kamis' },
  { value: 'Fri', label: 'Jumat' },
  { value: 'Sat', label: 'Sabtu' },
  { value: 'Sun', label: 'Minggu' },
];

const DAY_SHORT: Record<string, string> = { Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min' };

type ScheduleForm = {
  schedule_time: string;
  days_active: string[];
  template_ids: number[];
  active: boolean;
  user_id?: number;
};

export default function BroadcastTerjadwalPage() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'jadwal' | 'template' | 'autoreply'>('jadwal');
  const [schedules, setSchedules] = useState<BroadcastSchedule[]>([]);
  const [templates, setTemplates] = useState<{ id: number; title: string; is_default?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BroadcastSchedule | null>(null);
  const [marketingUsers, setMarketingUsers] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState<ScheduleForm>({ schedule_time: '09:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], template_ids: [], active: true });

  const loadSchedules = useCallback(async () => {
    try {
      const data = await scheduleService.getAll();
      setSchedules(data);
    } catch {
      toast('error', 'Gagal memuat jadwal');
    }
  }, [toast]);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await templateService.getAll();
      setTemplates(data.map((t) => ({ id: t.id, title: t.title, is_default: t.is_default })));
    } catch {
      toast('error', 'Gagal memuat template');
    }
  }, [toast]);

  useEffect(() => {
    Promise.all([
      loadSchedules(),
      loadTemplates(),
      isAdmin ? customerService.getMarketingUsers().catch(() => []) : Promise.resolve([]),
    ]).then(([, , users]) => {
      setMarketingUsers(users);
    }).finally(() => setLoading(false));
  }, [loadSchedules, loadTemplates, isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm({ schedule_time: '09:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], template_ids: [], active: true });
    setModalOpen(true);
  };

  const openEdit = (s: BroadcastSchedule) => {
    setEditing(s);
    setForm({
      schedule_time: s.schedule_time.slice(0, 5),
      days_active: s.days_active,
      template_ids: s.template_ids ?? [],
      active: s.active,
    });
    setModalOpen(true);
  };

  const setTemplateSlot = (slot: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.template_ids];
      next[slot] = value ? Number(value) : (0 as number);
      return { ...prev, template_ids: next };
    });
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      days_active: prev.days_active.includes(day)
        ? prev.days_active.filter((d) => d !== day)
        : [...prev.days_active, day],
    }));
  };

  const handleSave = async () => {
    if (!form.schedule_time || form.days_active.length === 0) {
      toast('error', 'Jam dan hari aktif wajib diisi');
      return;
    }
    const uniqueIds = [...new Set(form.template_ids.filter(Boolean))];
    if (uniqueIds.length !== 3) {
      toast('error', 'Wajib pilih 3 template yang berbeda');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        schedule_time: form.schedule_time,
        days_active: form.days_active,
        template_ids: uniqueIds,
        active: form.active,
        ...(isAdmin && form.user_id ? { user_id: form.user_id } : {}),
      };
      if (editing) {
        await scheduleService.update(editing.id, payload);
        toast('success', 'Jadwal berhasil diupdate');
      } else {
        await scheduleService.create(payload);
        toast('success', 'Jadwal berhasil ditambahkan');
      }
      setModalOpen(false);
      loadSchedules();
    } catch {
      toast('error', 'Gagal menyimpan jadwal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return;
    try {
      await scheduleService.delete(id);
      toast('success', 'Jadwal dihapus');
      loadSchedules();
    } catch {
      toast('error', 'Gagal menghapus jadwal');
    }
  };

  const handleToggleActive = async (s: BroadcastSchedule) => {
    try {
      await scheduleService.update(s.id, { active: !s.active });
      loadSchedules();
    } catch {
      toast('error', 'Gagal mengubah status jadwal');
    }
  };

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => a.schedule_time.localeCompare(b.schedule_time)),
    [schedules]
  );

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fif-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Broadcast Terjadwal</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Atur broadcast otomatis sesuai jadwal dan balasan otomatis pesan masuk
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-white/80 p-1 dark:border-slate-700/80 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTab('jadwal')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'jadwal'
              ? 'bg-fif-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          Jadwal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('template')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'template'
              ? 'bg-fif-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          Template
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('autoreply')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'autoreply'
              ? 'bg-fif-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Bot className="h-4 w-4" />
          Auto Reply
        </button>
      </div>

      {activeTab === 'template' && <TemplateTab />}

      {activeTab === 'autoreply' && <AutoReplyTab />}

      {activeTab === 'jadwal' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {sortedSchedules.length} jadwal aktif — broadcast otomatis dikirim sesuai jadwal dengan 3 variasi template.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-fif-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-fif-600/20 transition-all hover:bg-fif-700"
            >
              <Plus className="h-4 w-4" />
              Tambah Jadwal
            </button>
          </div>

          {sortedSchedules.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <AlarmClock className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada jadwal</p>
              <p className="mt-1 text-xs text-slate-400">Klik "Tambah Jadwal" untuk membuat jadwal broadcast otomatis harian.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800/90">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sortedSchedules.map((s) => {
                  const isMine = !s.user || s.user_id === user?.id;
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.active ? 'bg-fif-50 text-fif-600 dark:bg-fif-500/10 dark:text-fif-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-subheading text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{s.schedule_time.slice(0, 5)}</p>
                          <p className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
                            {s.days_active.map((d) => (
                              <span key={d} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                {DAY_SHORT[d] || d}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        {!isMine && s.user && (
                          <p className="flex items-center gap-1 text-xs font-medium text-fif-600 dark:text-fif-400">
                            <UserRound className="h-3 w-3" />
                            {s.user.name}{s.user.kios_name ? ` • ${s.user.kios_name}` : ''}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(s.template_ids ?? []).map((tid) => {
                            const t = templates.find((x) => x.id === tid);
                            return (
                              <span key={tid} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                {t?.title ?? `#${tid}`}
                              </span>
                            );
                          })}
                          {!s.template_ids?.length && (
                            <span className="text-xs italic text-slate-300 dark:text-slate-600">Template default kios</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${s.active ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${s.active ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-fif-600 dark:hover:bg-slate-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(s.id)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50/60 p-4 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Setiap jadwal <strong>wajib</strong> memakai 3 template berbeda. Broadcast dirotasi otomatis per customer untuk menghindari deteksi pesan spam oleh AI WhatsApp/Meta. Kelola template di tab <strong>Template</strong> (superadmin bisa menandai template default untuk semua role).
            </span>
          </div>
        </div>
      )}

      {/* Modal form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Jadwal' : 'Tambah Jadwal'}>
        <div className="space-y-4">
          <Input
            label="Jam Kirim"
            type="time"
            value={form.schedule_time}
            onChange={(e) => setForm((prev) => ({ ...prev, schedule_time: e.target.value }))}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Hari Aktif</label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((d) => {
                const on = form.days_active.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      on
                        ? 'bg-fif-600 text-white shadow'
                        : 'border border-slate-200 text-slate-500 hover:border-fif-400 hover:text-fif-600 dark:border-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isAdmin && (
            <Select
              label="Untuk User"
              options={marketingUsers.map((u) => ({ value: String(u.id), label: u.name }))}
              placeholder="Semua user (default)"
              value={form.user_id ? String(form.user_id) : ''}
              onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value ? Number(e.target.value) : undefined }))}
            />
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Template Broadcast <span className="text-fif-600">(wajib 3, anti-spam)</span>
            </label>
            <div className="space-y-2">
              {[0, 1, 2].map((slot) => (
                <Select
                  key={slot}
                  label={`Template ${slot + 1}`}
                  options={templates.map((t) => ({
                    value: String(t.id),
                    label: t.title + (t.is_default ? ' (Default)' : ''),
                  }))}
                  placeholder="Pilih template…"
                  value={form.template_ids[slot] ? String(form.template_ids[slot]) : ''}
                  onChange={(e) => setTemplateSlot(slot, e.target.value)}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              3 template ini dirotasi otomatis per customer agar pesan bervariasi dan terhindar dari deteksi spam.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif</p>
              <p className="text-xs text-slate-400">Jadwal dieksekusi jika aktif</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${form.active ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.active ? 'translate-x-[22px]' : 'translate-x-1'}`} />
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
