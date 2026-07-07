import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { permissionService, FEATURE_LABELS, type PermissionsByRole } from '../../services/permissionService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { Skeleton } from '../../components/ui/Skeleton';

export function PermissionManagementPage() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PermissionsByRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await permissionService.getAll();
      setPermissions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggle = (role: string, featureId: number) => {
    if (!permissions) return;
    setPermissions((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[role] = updated[role].map((p) =>
        p.id === featureId ? { ...p, enabled: !p.enabled } : p
      );
      return updated;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!permissions) return;
    setSaving(true);
    try {
      const payload = Object.values(permissions).flat().map((p) => ({
        id: p.id,
        enabled: p.enabled,
      }));
      await permissionService.update(payload);
      setDirty(false);
      toast('success', 'Permissions berhasil disimpan');
    } catch {
      toast('error', 'Gagal menyimpan permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Role Permissions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Memuat...</p>
        </div>
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  const roles = permissions ? Object.keys(permissions) : [];
  const features = permissions && roles.length > 0
    ? permissions[roles[0]].map((p) => p.feature)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Role Permissions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atur fitur yang dapat diakses masing-masing role. Superadmin memiliki akses penuh.
          </p>
        </div>
        {dirty && (
          <Button loading={saving} icon={<Save className="h-4 w-4" />} onClick={handleSave}>
            Simpan Perubahan
          </Button>
        )}
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3.5">Fitur</th>
                {roles.map((role) => (
                  <th key={role} className="px-5 py-3.5 text-center">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {features.map((feature) => (
                <tr key={feature} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/80">
                  <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                    {FEATURE_LABELS[feature] || feature}
                  </td>
                  {roles.map((role) => {
                    const perm = permissions?.[role]?.find((p) => p.feature === feature);
                    return (
                      <td key={role} className="px-5 py-3.5 text-center">
                        <label className="inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={perm?.enabled ?? false}
                            onChange={() => perm && toggle(role, perm.id)}
                            className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-fif-600 dark:text-fif-400 transition-colors focus:ring-fif-500/30 focus:ring-offset-1"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {dirty && (
        <div className="flex justify-end">
          <Button loading={saving} icon={<Save className="h-4 w-4" />} onClick={handleSave} size="lg">
            Simpan Perubahan
          </Button>
        </div>
      )}
    </div>
  );
}
