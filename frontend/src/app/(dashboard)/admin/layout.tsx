'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminLayout as AdminLayoutComponent } from '@/components/layouts/AdminLayout';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'superadmin' && user.role !== 'UH' && user.role !== 'AO') {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-fif-500 border-t-transparent" />
      </div>
    );
  }

  if (!user || (user.role !== 'superadmin' && user.role !== 'UH' && user.role !== 'AO')) return null;

  return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
