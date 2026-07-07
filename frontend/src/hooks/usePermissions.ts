import { useState, useEffect } from 'react';
import { permissionService, type PermissionsByRole } from '../services/permissionService';
import { useAuth } from '../context/AuthContext';

let cache: { data: PermissionsByRole | null; promise: Promise<void> | null } = {
  data: null,
  promise: null,
};

export function usePermissions() {
  const { user } = useAuth();

  const [perms, setPerms] = useState<PermissionsByRole | null>(cache.data);
  const [loading, setLoading] = useState(() => {
    if (!user || user.role === 'superadmin') return false;
    return !cache.data;
  });

  useEffect(() => {
    if (!user || user.role === 'superadmin') {
      setPerms(null);
      setLoading(false);
      return;
    }

    if (cache.data) {
      setPerms(cache.data);
      setLoading(false);
      return;
    }

    if (cache.promise) {
      setLoading(true);
      cache.promise.then(() => {
        setPerms(cache.data);
        setLoading(false);
      });
      return;
    }

    const p = permissionService.getAll()
      .then((data) => {
        cache.data = data;
        setPerms(data);
      })
      .catch(() => {
        cache.data = null;
      })
      .finally(() => {
        cache.promise = null;
        setLoading(false);
      });

    cache.promise = p;
    setLoading(true);
  }, [user]);

  const hasFeature = (feature: string): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (loading) return true;
    if (!perms || !perms[user.role]) return false;
    const p = perms[user.role].find((item) => item.feature === feature);
    return p ? p.enabled : false;
  };

  return { hasFeature, loading };
}
