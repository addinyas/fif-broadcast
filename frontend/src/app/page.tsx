'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

export default function HomePage() {
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
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return <SplashScreen />;
}
