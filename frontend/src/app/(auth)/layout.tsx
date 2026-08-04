'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (user.role === 'superadmin' || user.role === 'UH' || user.role === 'AO') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/marketing/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-fif-500 border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  return <>{children}</>;
}
