import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import { clearPermissionsCache } from '../hooks/usePermissions';
import { disconnectSocket } from '../services/socketService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (npoMceId: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email?: string;
    password: string;
    gender: string;
    npo_mce_id: string;
    kios_id: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAdmin: boolean;
  isMarketing: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (token && !user) {
      initialized.current = true;
      authService.me()
        .then(setUser)
        .catch(() => { sessionStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, user]);

  const login = async (npoMceId: string, password: string) => {
    const res = await authService.login(npoMceId, password);
    sessionStorage.setItem('token', res.token);
    sessionStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (payload: {
    name: string;
    email?: string;
    password: string;
    gender: string;
    npo_mce_id: string;
    kios_id: string;
  }) => {
    const res = await authService.register(payload);
    sessionStorage.setItem('token', res.token);
    sessionStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const updateUser = (updated: User) => {
    sessionStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  const logout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    clearPermissionsCache();
    disconnectSocket();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'superadmin' || user?.role === 'UH';
  const isMarketing = user?.role === 'marketing';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAdmin, isMarketing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthContext');
  return ctx;
}
