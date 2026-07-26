'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MarketingLayout as MarketingLayoutComponent } from '@/components/layouts/MarketingLayout';

export default function MarketingDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'marketing') {
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

  if (!user || user.role !== 'marketing') return null;

  return <MarketingLayoutComponent>{children}</MarketingLayoutComponent>;
}
