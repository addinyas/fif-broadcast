'use client';

import { useEffect, useState } from 'react';
import { Loader2, Bell, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/Input';
import { scheduleService, type NotifSettings } from '@/services/scheduleService';
import AiTab from './AiTab';

export default function PengaturanPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'notifikasi' | 'ai'>('notifikasi');
  const [notif, setNotif] = useState<NotifSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    scheduleService.getNotifSettings().catch(() => null)
      .then((data) => {
        setNotif(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveNotif = async () => {
    if (!notif) return;
    setSaving(true);
    try {
      await scheduleService.updateNotifSettings({
        notif_disconnect_enabled: notif.notif_disconnect_enabled.value === '1',
        notif_disconnect_level: notif.notif_disconnect_level.value || 'total',
      });
      toast('success', 'Pengaturan notifikasi disimpan');
    } catch {
      toast('error', 'Gagal menyimpan pengaturan notifikasi');
    } finally {
      setSaving(false);
    }
  };

  const notifEnabled = notif?.notif_disconnect_enabled.value === '1';

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fif-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pengaturan</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Atur notifikasi WhatsApp dan AI
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-white/80 p-1 dark:border-slate-700/80 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTab('notifikasi')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'notifikasi'
              ? 'bg-fif-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Bell className="h-4 w-4" />
          Notifikasi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'ai'
              ? 'bg-fif-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI
        </button>
      </div>

      {activeTab === 'ai' && <AiTab />}

      {activeTab === 'notifikasi' && notif && (
        <div className="max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-700/80 dark:bg-slate-800/90">
          <h2 className="font-subheading text-lg font-semibold text-slate-800 dark:text-slate-100">Notifikasi WhatsApp Terputus</h2>
          <p className="mt-1 text-sm text-slate-400">Kirim notifikasi saat koneksi WhatsApp user terputus.</p>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktifkan notifikasi</p>
              <p className="mt-0.5 text-xs text-slate-400">Notifikasi push dikirim ke aplikasi saat WA terputus</p>
            </div>
            <button
              type="button"
              onClick={() => setNotif((prev) => prev ? { ...prev, notif_disconnect_enabled: { ...prev.notif_disconnect_enabled, value: notifEnabled ? '0' : '1' } } : prev)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${notifEnabled ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${notifEnabled ? 'translate-x-[22px]' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="mt-6">
            <Select
              label="Level Notifikasi"
              options={[
                { value: 'total', label: 'Total terputus saja (rekap harian)' },
                { value: 'all', label: 'Per user (detail siapa yang putus)' },
              ]}
              value={notif.notif_disconnect_level.value || 'total'}
              onChange={(e) => setNotif((prev) => prev ? { ...prev, notif_disconnect_level: { ...prev.notif_disconnect_level, value: e.target.value } } : prev)}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotif}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-fif-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-fif-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
