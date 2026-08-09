'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function FloatingChatButton() {
  const { isAdmin } = useAuth();
  const prefix = isAdmin ? '/admin' : '/marketing';

  return (
    <Link
      href={`${prefix}/inbox`}
      aria-label="Buka Inbox"
      className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-fif-600 text-white shadow-lg shadow-fif-600/30 transition hover:scale-105 hover:bg-fif-700 lg:hidden"
    >
      <MessageSquare className="h-6 w-6" />
    </Link>
  );
}
