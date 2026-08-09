'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, XCircle, Brain, MessageSquareText, Target } from 'lucide-react';
import { aiService, type AiTestResult } from '@/services/aiService';
import { useToast } from '@/components/ui/Toast';

export default function AiTab() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [model, setModel] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [classify, setClassify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    aiService.getSettings()
      .then((s) => {
        setUrl(s.ai_ollama_url?.value ?? 'http://localhost:11434');
        setModel(s.ai_ollama_model?.value ?? 'qwen2.5:1.5b');
        setAutoReply(s.ai_auto_reply_enabled?.value === '1');
        setClassify(s.ai_classify_enabled?.value === '1');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await aiService.updateSettings({
        ai_ollama_url: url,
        ai_ollama_model: model,
        ai_auto_reply_enabled: autoReply,
        ai_classify_enabled: classify,
      });
      toast('success', 'Pengaturan AI tersimpan');
    } catch {
      toast('error', 'Gagal menyimpan pengaturan AI');
    } finally {
      setSaving(false);
    }
  }, [url, model, autoReply, classify, toast]);

  const runTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await aiService.updateSettings({ ai_ollama_url: url, ai_ollama_model: model });
      setTestResult(await aiService.test());
    } catch {
      toast('error', 'Gagal test koneksi');
    } finally {
      setTesting(false);
    }
  }, [url, model, toast]);

  const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition hover:border-fif-300 dark:border-slate-700/80 dark:bg-slate-800/90"
    >
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
      </div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-fif-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/90">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-fif-600" />
          <h3 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-100">AI Engine (Ollama)</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Instal Ollama di server: <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-700">curl -fsSL https://ollama.com/install.sh | sh</code>, lalu <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-700">ollama pull qwen2.5:1.5b</code>
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">URL Ollama</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-fif-400 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Model</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="qwen2.5:1.5b"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-fif-400 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-fif-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fif-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Simpan
          </button>
          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Test Koneksi
          </button>
        </div>

        {testResult && (
          <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            testResult.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {testResult.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              {testResult.ok
                ? `Terhubung ke ${testResult.url} · model ${testResult.model} tersedia`
                : `Tidak terhubung: ${testResult.error ?? 'cek URL & pastikan Ollama jalan'}`}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Toggle
          checked={autoReply}
          onChange={setAutoReply}
          label="Auto-reply Pintar (AI)"
          desc="Balas pesan masuk otomatis dengan AI. Jatuh ke aturan Auto Reply bila AI mati."
        />
        <Toggle
          checked={classify}
          onChange={setClassify}
          label="Klasifikasi Skor Prospect (AI)"
          desc="Baca pesan masuk, klasifikasi skor 25/50/75/100% lalu isi ke customers.prospect_score (otomatis)."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-800/90">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-fif-600" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rekomendasi di Inbox</h4>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Di halaman Inbox, AI menyarankan balasan per pesan customer. Kamu tinggal edit lalu kirim.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-800/90">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-fif-600" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Lihat hasil di Laporan</h4>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Skor klasifikasi tampil di halaman Laporan Prospect (tabel + pie chart per marketing).
          </p>
        </div>
      </div>
    </div>
  );
}
