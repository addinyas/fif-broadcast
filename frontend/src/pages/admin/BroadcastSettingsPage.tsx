import { useState, useEffect, useMemo } from 'react';
import { Save, Loader2, RotateCcw, Send, Timer, Coffee, Settings2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { Skeleton } from '../../components/ui/Skeleton';

interface SettingDef {
  label: string;
  type: 'number' | 'boolean';
  value: string | null;
  min?: number;
  max?: number;
}

interface FieldMeta {
  description: string;
  hint?: string;
  unit?: string;
  group: 'send' | 'delay' | 'rest' | 'break' | 'other';
  groupLabel: string;
  groupIcon: React.ReactNode;
  groupColor: string;
  groupDescription: string;
}

const FIELD_META: Record<string, FieldMeta> = {
  messages_per_session: {
    description: 'Jumlah pesan yang dikirim dalam satu sesi sebelum jeda.',
    hint: 'Semakin sedikit, semakin aman dari blokir WA.',
    unit: 'pesan',
    group: 'send',
    groupLabel: 'Pengiriman Pesan',
    groupIcon: <Send className="h-4 w-4" />,
    groupColor: 'fif',
    groupDescription: 'Mengatur cara pesan dikirim ke customer.',
  },
  concurrency: {
    description: 'Berapa banyak akun yang bisa kirim broadcast bersamaan.',
    hint: 'Jangan terlalu tinggi agar tidak terdeteksi sebagai spam.',
    unit: 'akun',
    group: 'send',
    groupLabel: 'Pengiriman Pesan',
    groupIcon: <Send className="h-4 w-4" />,
    groupColor: 'fif',
    groupDescription: 'Mengatur cara pesan dikirim ke customer.',
  },
  min_delay_sec: {
    description: 'Waktu minimum antar pesan.',
    hint: 'Disarankan minimal 6 detik.',
    unit: 'detik',
    group: 'delay',
    groupLabel: 'Jeda Antar Pesan',
    groupIcon: <Timer className="h-4 w-4" />,
    groupColor: 'amber',
    groupDescription: 'Mengatur jeda waktu antar pesan agar tidak terdeteksi spam.',
  },
  max_delay_sec: {
    description: 'Waktu maksimum antar pesan.',
    hint: 'Delay acak antara min dan max untuk variasi.',
    unit: 'detik',
    group: 'delay',
    groupLabel: 'Jeda Antar Pesan',
    groupIcon: <Timer className="h-4 w-4" />,
    groupColor: 'amber',
    groupDescription: 'Mengatur jeda waktu antar pesan agar tidak terdeteksi spam.',
  },
  random_delay: {
    description: 'Buat delay antar pesan tidak teratur (lebih natural).',
    group: 'delay',
    groupLabel: 'Jeda Antar Pesan',
    groupIcon: <Timer className="h-4 w-4" />,
    groupColor: 'amber',
    groupDescription: 'Mengatur jeda waktu antar pesan agar tidak terdeteksi spam.',
  },
  rest_every_x_messages: {
    description: 'Istirahat otomatis setelah mengirim sejumlah pesan.',
    hint: 'Memberi jeda panjang agar akun tidak kelelahan.',
    unit: 'pesan',
    group: 'rest',
    groupLabel: 'Istirahat Berkala',
    groupIcon: <Coffee className="h-4 w-4" />,
    groupColor: 'emerald',
    groupDescription: 'Jeda panjang secara berkala untuk mengurangi risiko blokir.',
  },
  rest_duration_min_sec: {
    description: 'Durasi minimum istirahat.',
    unit: 'detik',
    group: 'rest',
    groupLabel: 'Istirahat Berkala',
    groupIcon: <Coffee className="h-4 w-4" />,
    groupColor: 'emerald',
    groupDescription: 'Jeda panjang secara berkala untuk mengurangi risiko blokir.',
  },
  rest_duration_max_sec: {
    description: 'Durasi maksimum istirahat.',
    unit: 'detik',
    group: 'rest',
    groupLabel: 'Istirahat Berkala',
    groupIcon: <Coffee className="h-4 w-4" />,
    groupColor: 'emerald',
    groupDescription: 'Jeda panjang secara berkala untuk mengurangi risiko blokir.',
  },
  session_break_min_sec: {
    description: 'Jeda minimum antara satu sesi dan sesi berikutnya.',
    hint: 'Sesi berikutnya baru mulai setelah jeda ini.',
    unit: 'detik',
    group: 'break',
    groupLabel: 'Jeda Antar Sesi',
    groupIcon: <Coffee className="h-4 w-4" />,
    groupColor: 'purple',
    groupDescription: 'Jeda panjang antara sesi pengiriman.',
  },
  session_break_max_sec: {
    description: 'Jeda maksimum antara sesi.',
    unit: 'detik',
    group: 'break',
    groupLabel: 'Jeda Antar Sesi',
    groupIcon: <Coffee className="h-4 w-4" />,
    groupColor: 'purple',
    groupDescription: 'Jeda panjang antara sesi pengiriman.',
  },
  max_retry: {
    description: 'Berapa kali mencoba ulang jika pesan gagal.',
    hint: '0 = tidak ada retry.',
    unit: 'kali',
    group: 'other',
    groupLabel: 'Lainnya',
    groupIcon: <Settings2 className="h-4 w-4" />,
    groupColor: 'slate',
    groupDescription: 'Pengaturan tambahan untuk broadcast.',
  },
  random_template: {
    description: 'Pilih template secara acak jika ada lebih dari satu template.',
    group: 'other',
    groupLabel: 'Lainnya',
    groupIcon: <Settings2 className="h-4 w-4" />,
    groupColor: 'slate',
    groupDescription: 'Pengaturan tambahan untuk broadcast.',
  },
  queue_enabled: {
    description: 'Aktifkan antrian pesan otomatis.',
    hint: 'Matikan jika ingin kirim manual.',
    group: 'other',
    groupLabel: 'Lainnya',
    groupIcon: <Settings2 className="h-4 w-4" />,
    groupColor: 'slate',
    groupDescription: 'Pengaturan tambahan untuk broadcast.',
  },
};

function formatTime(sec: number): string {
  if (sec >= 3600) return `${Math.floor(sec / 3600)}j ${Math.floor((sec % 3600) / 60)}m`;
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

const GROUP_COLORS: Record<string, { border: string; bg: string; icon: string; dot: string }> = {
  fif: { border: 'border-l-fif-500', bg: 'bg-fif-50 dark:bg-fif-900/20', icon: 'text-fif-600 dark:text-fif-400', dot: 'bg-fif-500' },
  amber: { border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  purple: { border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
  slate: { border: 'border-l-slate-400', bg: 'bg-slate-50 dark:bg-slate-700/30', icon: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
};

export function BroadcastSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, SettingDef>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<{ data: Record<string, SettingDef> }>('admin/broadcast-settings')
      .then(({ data }) => {
        setSettings(data.data);
        const v: Record<string, string> = {};
        for (const [key, def] of Object.entries(data.data)) {
          v[key] = def.value ?? '';
        }
        setValues(v);
      })
      .catch(() => toast('error', 'Gagal memuat pengaturan'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('admin/broadcast-settings', values);
      toast('success', 'Pengaturan berhasil disimpan');
    } catch {
      toast('error', 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const reset: Record<string, string> = {};
    for (const [key, def] of Object.entries(settings)) {
      reset[key] = def.value ?? '';
    }
    setValues(reset);
  };

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; icon: React.ReactNode; color: string; description: string; keys: string[] }>();
    for (const key of Object.keys(settings)) {
      const meta = FIELD_META[key];
      if (!meta) continue;
      if (!map.has(meta.group)) {
        map.set(meta.group, { label: meta.groupLabel, icon: meta.groupIcon, color: meta.groupColor, description: meta.groupDescription, keys: [] });
      }
      map.get(meta.group)!.keys.push(key);
    }
    return Array.from(map.values());
  }, [settings]);

  const queueEnabled = values['queue_enabled'] === '1';
  const msgsPerSession = parseInt(values['messages_per_session'] || '50', 10);
  const minDelay = parseInt(values['min_delay_sec'] || '6', 10);
  const maxDelay = parseInt(values['max_delay_sec'] || '12', 10);
  const avgDelay = (minDelay + maxDelay) / 2;
  const sessionCount = 3;
  const totalMsgs = msgsPerSession * sessionCount;
  const msgsPerHour = avgDelay > 0 ? Math.round(3600 / avgDelay) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-fif-800 to-fif-600 p-6 text-white shadow-xl shadow-fif-900/30 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.03]" />
        <div className="absolute right-0 top-0 h-px w-2/3 bg-gradient-to-r from-white/20 to-transparent" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Pengaturan Broadcast
          </h1>
          <p className="mt-2 max-w-xl text-sm text-fif-200/70">
            Atur bagaimana pesan dikirim ke customer. Pengaturan yang aman membantu menghindari blokir dari WhatsApp.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Per Sesi</p>
          <p className="font-satoshi mt-1 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{msgsPerSession}</p>
          <p className="text-xs text-slate-400">pesan dikirim</p>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Sesi</p>
          <p className="font-satoshi mt-1 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{sessionCount}</p>
          <p className="text-xs text-slate-400">{totalMsgs} pesan total</p>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Kecepatan</p>
          <p className="font-satoshi mt-1 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">~{msgsPerHour}</p>
          <p className="text-xs text-slate-400">pesan/jam</p>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${queueEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <p className="font-satoshi text-lg font-bold text-slate-800 dark:text-slate-100">{queueEnabled ? 'Aktif' : 'Nonaktif'}</p>
          </div>
          <p className="text-xs text-slate-400">antrian pesan</p>
        </div>
      </div>

      {/* Setting groups */}
      {groups.map((group) => {
        const colors = GROUP_COLORS[group.color] || GROUP_COLORS.slate;
        const isCollapsed = collapsed[group.color] || false;

        return (
          <Card key={group.color} className="!p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [group.color]: !prev[group.color] }))}
              className={`flex w-full items-center gap-3 border-l-4 p-5 text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20 ${colors.border}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.bg} ${colors.icon}`}>
                {group.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-200">{group.label}</h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{group.description}</p>
              </div>
              {isCollapsed
                ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                : <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />}
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700/50 dark:border-slate-700/50">
                {group.keys.map((key) => {
                  const def = settings[key];
                  if (!def) return null;
                  const meta = FIELD_META[key];
                  if (!meta) return null;

                  if (def.type === 'boolean') {
                    const isOn = values[key] === '1';
                    return (
                      <div key={key} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{meta.description}</p>
                          {meta.hint && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                              <Info className="h-3 w-3 shrink-0" />
                              {meta.hint}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setValues((prev) => ({ ...prev, [key]: isOn ? '0' : '1' }))}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                            isOn ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              isOn ? 'translate-x-[22px]' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  }

                  const numVal = parseInt(values[key] || '0', 10);
                  const showPreview = meta.unit === 'detik' && numVal > 0;

                  return (
                    <div key={key} className="px-5 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{meta.description}</p>
                          {meta.hint && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                              <Info className="h-3 w-3 shrink-0" />
                              {meta.hint}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={def.min}
                            max={def.max}
                            value={values[key] ?? ''}
                            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right text-sm font-mono tabular-nums outline-none transition-all focus:border-fif-500 focus:bg-white focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus:border-fif-400 dark:focus:bg-slate-600"
                          />
                          {showPreview && (
                            <span className="min-w-[60px] rounded-md bg-slate-100 px-2 py-1 text-center text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                              {formatTime(numVal)}
                            </span>
                          )}
                          {!showPreview && meta.unit && (
                            <span className="min-w-[60px] text-xs text-slate-400">{meta.unit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {/* Action buttons */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700/50">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          Kembali ke Default
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-fif-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-fif-600/20 transition-all hover:bg-fif-700 hover:shadow-lg hover:shadow-fif-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}
