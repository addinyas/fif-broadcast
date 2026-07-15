import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 animate-fade-in">
      <div className="text-center relative">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fif-500/20 blur-[80px]" />
        <h1 className="font-heading bg-gradient-to-br from-white to-white/20 bg-clip-text text-8xl font-extrabold tracking-tight text-transparent drop-shadow-sm">404</h1>
        <h2 className="font-heading -mt-4 text-2xl font-bold text-white drop-shadow-sm">Halaman Tidak Ditemukan</h2>
        <p className="mt-2 text-slate-400">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
      </div>
      <Link to="/">
        <Button variant="primary" size="lg" icon={<Home className="h-4 w-4" />}>
          Kembali ke Beranda
        </Button>
      </Link>
    </div>
  );
}
