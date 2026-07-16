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
      <div className="font-poppins space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Role Permissions</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Memuat...</p>
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
    <div className="font-poppins space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Role Permissions</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
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
              <tr className="border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                 <th className="px-5 py-3.5">Fitur</th>
                {roles.map((role) => (
                  <th key={role} className="px-5 py-3.5 text-center">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {features.map((feature) => (
                <tr key={feature} className="transition-all duration-150 hover:bg-fif-50/50 dark:hover:bg-fif-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/30">
                   <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                     {FEATURE_LABELS[feature] || feature}
                   </td>
                   {roles.map((role) => {
                     const perm = permissions?.[role]?.find((p) => p.feature === feature);
                     return (
                       <td key={role} className="px-5 py-3.5 text-center">
                         <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                           <input
                             type="checkbox"
                             checked={perm?.enabled ?? false}
                             onChange={() => perm && toggle(role, perm.id)}
                             className="peer sr-only"
                           />
                           <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-fif-500 dark:bg-slate-600 dark:peer-checked:bg-fif-400" />
                           <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:translate-x-5 peer-checked:shadow-md" />
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
