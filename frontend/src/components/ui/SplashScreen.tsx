'use client';

import { motion } from 'framer-motion';

export function SplashScreen() {
  return (
    <div
      className="flex h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: '#080e1a' }}
    >
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, rgba(59,130,246,0.6), rgba(139,92,246,0.6), rgba(59,130,246,0.6))',
            filter: 'blur(3px)',
            padding: '2px',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full ring-1 ring-white/10"
          style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)' }}
        >
          <img src="/logofif.png" alt="FIF" className="relative h-14 w-14 object-contain drop-shadow-2xl" />
        </div>
      </div>
      <motion.p
        className="text-sm font-semibold tracking-tight text-white"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        Memuat aplikasi
      </motion.p>
      <p className="mt-1.5 text-xs text-slate-500">Federal International Finance</p>
    </div>
  );
}
