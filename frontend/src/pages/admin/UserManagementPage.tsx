import { useState, useEffect, useCallback } from 'react';
import { Trash2, Wifi, WifiOff, Smartphone, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { TableSkeleton } from '../../components/ui/Skeleton';
import type { User } from '../../types';

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const handleDelete = async (user: User) => {
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast('success', `${user.name} berhasil dihapus`);
      fetchUsers();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      toast('error', resp?.data?.message || 'Gagal menghapus user');
    }
  };

  const handleRoleChange = async (user: User, newRole: string) => {
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
      toast('success', `Role ${user.name} diubah ke ${newRole}`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Object && 'response' in err
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Gagal mengubah role';
      toast('error', msg);
    }
  };

  const roleBadge = (role: string) => {
    const variants: Record<string, 'danger' | 'info' | 'success'> = {
      superadmin: 'danger',
      UH: 'info',
      marketing: 'success',
    };
    return <Badge variant={variants[role] || 'default'}>{role}</Badge>;
  };

  const waStatusBadge = (status?: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default' | 'purple'; icon: React.ReactNode; label: string }> = {
      connected: { variant: 'success', icon: <Wifi className="h-3 w-3" />, label: 'Terhubung' },
      awaiting_scan: { variant: 'warning', icon: <Smartphone className="h-3 w-3" />, label: 'Menunggu scan' },
      logged_out: { variant: 'danger', icon: <WifiOff className="h-3 w-3" />, label: 'Terputus' },
      disconnected: { variant: 'default', icon: <AlertTriangle className="h-3 w-3" />, label: 'Belum connect' },
    };
    const c = config[status ?? 'disconnected'] || config.disconnected;
    return (
      <Badge variant={c.variant} size="sm">
        <span className="flex items-center gap-1">{c.icon}{c.label}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">User Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola user dan role</p>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                   <th className="px-5 py-3.5">Nama</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">WhatsApp</th>
                  <th className="px-5 py-3.5">Dibuat</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="transition-all duration-150 hover:bg-fif-50/50 dark:hover:bg-fif-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-5 py-3.5">
                      {u.role !== 'superadmin' && !(currentUser?.role === 'UH' && u.role === 'UH') ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                        >
                          <option value="UH">UH</option>
                          <option value="marketing">marketing</option>
                        </select>
                      ) : (
                        roleBadge(u.role)
                      )}
                    </td>
                    <td className="px-5 py-3.5">{waStatusBadge(u.whatsapp_connection)}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.id !== currentUser?.id && u.role !== 'superadmin' && !(currentUser?.role === 'UH' && u.role === 'UH') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => handleDelete(u)}
                          className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        >
                          Hapus
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">Tidak ada user</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
