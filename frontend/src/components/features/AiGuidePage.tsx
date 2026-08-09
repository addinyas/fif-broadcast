'use client';

import { Bot, Server, MessageSquareText, Target, AlertTriangle, CheckCircle2, Loader2, Copy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

function CodeBlock({ text }: { text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 dark:bg-slate-950">
      <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs text-slate-200">{text}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          toast('success', 'Perintah disalin');
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
      >
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

const STEPS = [
  {
    icon: Server,
    title: '1. Install Ollama di server',
    desc: 'Jalankan di VPS (butuh ±1 GB RAM untuk model qwen2.5:1.5b). RAM 4 GB cukup.',
    code: 'curl -fsSL https://ollama.com/install.sh | sh',
  },
  {
    icon: Loader2,
    title: '2. Pull model AI',
    desc: 'Model kecil ini sudah cukup untuk klasifikasi skor & balasan singkat.',
    code: 'ollama pull qwen2.5:1.5b',
  },
  {
    icon: Bot,
    title: '3. Isi Pengaturan AI',
    desc: 'Buka Menu → Pengaturan → tab AI. Isi URL (default http://localhost:11434) dan nama model, lalu klik "Test Koneksi".',
    code: null,
  },
  {
    icon: MessageSquareText,
    title: '4. Aktifkan Auto-reply Pintar',
    desc: 'Toggle "Auto-reply Pintar" di tab AI. Pesan masuk akan dibalas AI otomatis; bila AI mati akan jatuh ke aturan Auto Reply biasa.',
    code: null,
  },
  {
    icon: Target,
    title: '5. Aktifkan Klasifikasi Skor',
    desc: 'Toggle "Klasifikasi Skor Prospect". Pesan masuk diklasifikasi 25/50/75/100% dan diisi ke customers.prospect_score (customer tanpa skor saja). Lihat hasilnya di Laporan Prospect.',
    code: null,
  },
  {
    icon: SparklesFallback,
    title: '6. Saran balasan manual di Inbox',
    desc: 'Di halaman Inbox, klik ikon ⚡ di kolom balas untuk minta AI menyarankan jawaban atas pesan customer terakhir.',
    code: null,
  },
];

function SparklesFallback({ className }: { className?: string }) {
  return <MessageSquareText className={className} />;
}

export default function AiGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Panduan AI Engine</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Cara mengaktifkan AI untuk auto-reply dan klasifikasi skor prospect.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          AI hanya jalan bila Ollama sudah terpasang dan model sudah di-pull di server yang sama dengan aplikasi (atau URL Ollama yang bisa diakses). Tanpa Ollama, fitur AI tidak aktif dan sistem tetap berjalan seperti biasa.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/90">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fif-50 text-fif-600 dark:bg-fif-500/10 dark:text-fif-400">
                <s.icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-100">{s.title}</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
            {s.code && (
              <div className="mt-3">
                <CodeBlock text={s.code} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
