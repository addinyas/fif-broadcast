import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="text-center">
        <h1 className="text-8xl font-extrabold tracking-tight text-white/10">404</h1>
        <h2 className="-mt-4 text-2xl font-bold text-white">Halaman Tidak Ditemukan</h2>
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
