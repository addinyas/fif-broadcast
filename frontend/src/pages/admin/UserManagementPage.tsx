import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Trash2, Wifi, WifiOff, Smartphone, AlertTriangle, Key, Pencil, ChevronDown, ChevronRight, Store } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { TableSkeleton } from '../../components/ui/Skeleton';
import type { User, Kios } from '../../types';

function formatTime(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKios, setExpandedKios] = useState<Set<string>>(new Set());

  // Reset password modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  // Edit kios modal
  const [editKiosUser, setEditKiosUser] = useState<User | null>(null);
  const [editKiosId, setEditKiosId] = useState('');
  const [kiosList, setKiosList] = useState<Kios[]>([]);
  const [editKiosSaving, setEditKiosSaving] = useState(false);

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
  }, [fetchUsers]);

  const groups = useMemo(() => {
    const map = new Map<string, { kios_name: string; users: User[] }>();
    for (const u of users) {
      const key = u.kios_id || 'unknown';
      if (!map.has(key)) map.set(key, { kios_name: u.kios_name || key, users: [] });
      map.get(key)!.users.push(u);
    }
    return Array.from(map.entries());
  }, [users]);

  const hasExpanded = useRef(false);

  useEffect(() => {
    if (!hasExpanded.current && groups.length > 0) {
      setExpandedKios(new Set(groups.map(([k]) => k)));
      hasExpanded.current = true;
    }
  }, [groups]);

  const toggleKios = (kiosId: string) => {
    setExpandedKios((prev) => {
      const next = new Set(prev);
      if (next.has(kiosId)) next.delete(kiosId);
      else next.add(kiosId);
      return next;
    });
  };

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

  const openResetPassword = (user: User) => {
    setResetModalUser(user);
    setResetPassword('');
  };

  const handleResetPassword = async () => {
    if (!resetModalUser || !resetPassword) return;
    setResetSaving(true);
    try {
      await api.put(`/admin/users/${resetModalUser.id}/reset-password`, { password: resetPassword });
      toast('success', `Password ${resetModalUser.name} berhasil direset`);
      setResetModalUser(null);
    } catch {
      toast('error', 'Gagal mereset password');
    } finally {
      setResetSaving(false);
    }
  };

  const openEditKios = async (user: User) => {
    if (kiosList.length === 0) {
      try {
        const { data } = await api.get('/kios');
        setKiosList(data.data);
      } catch { /* ignore */ }
    }
    setEditKiosUser(user);
    setEditKiosId(user.kios_id || '');
  };

  const handleEditKios = async () => {
    if (!editKiosUser || !editKiosId) return;
    setEditKiosSaving(true);
    try {
      await api.put(`/admin/users/${editKiosUser.id}/kios`, { kios_id: editKiosId });
      toast('success', `Kios ${editKiosUser.name} berhasil diupdate`);
      setEditKiosUser(null);
      fetchUsers();
    } catch {
      toast('error', 'Gagal mengupdate kios');
    } finally {
      setEditKiosSaving(false);
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
    const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; icon: React.ReactNode; label: string }> = {
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

  const isSuperadmin = currentUser?.role === 'superadmin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">User Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola user dan role</p>
      </div>

      {loading ? (
        <Card padding={false}>
          <div className="p-6">
            <TableSkeleton rows={4} cols={6} />
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([kiosId, group]) => (
            <Card key={kiosId} padding={false}>
              <button
                onClick={() => toggleKios(kiosId)}
                className="flex w-full items-center gap-3 border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 px-5 py-3.5 text-left"
              >
                <Store className="h-4 w-4 text-fif-500" />
                {expandedKios.has(kiosId) ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {group.kios_name} ({kiosId})
                </span>
                <Badge variant="default" size="sm">{group.users.length} user</Badge>
              </button>

              {expandedKios.has(kiosId) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-5 py-3">Nama</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">NPO/MCE</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">WhatsApp</th>
                        <th className="px-5 py-3">Terakhir Connect</th>
                        <th className="px-5 py-3">Terakhir Broadcast</th>
                        <th className="px-5 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {group.users.map((u) => (
                        <tr key={u.id} className="transition-all duration-150 hover:bg-fif-50/50 dark:hover:bg-fif-900/20">
                          <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{u.email || '-'}</td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{u.npo_mce_id || '-'}</td>
                          <td className="px-5 py-3">
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
                          <td className="px-5 py-3">{waStatusBadge(u.whatsapp_connection)}</td>
                          <td className="px-5 py-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatTime(u.last_connected_at)}</div>
                            {u.last_connected_at && <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatDate(u.last_connected_at)}</div>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatTime(u.last_broadcast_at)}</div>
                            {u.last_broadcast_at && <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatDate(u.last_broadcast_at)}</div>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {u.id !== currentUser?.id && u.role !== 'superadmin' && !(currentUser?.role === 'UH' && u.role === 'UH') && (
                              <div className="flex items-center justify-end gap-1">
                                {isSuperadmin && (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => openEditKios(u)} title="Edit Kios" className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => openResetPassword(u)} title="Reset Password" className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                      <Key className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} title="Hapus" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
          {groups.length === 0 && (
            <Card>
              <p className="text-center text-slate-500 dark:text-slate-400">Tidak ada user</p>
            </Card>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-1 font-subheading text-lg font-bold text-slate-800 dark:text-slate-200">Reset Password</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Untuk: {resetModalUser.name}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Password Baru</label>
              <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} autoFocus
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder="Minimal 8 karakter" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResetModalUser(null)}>Batal</Button>
              <Button onClick={handleResetPassword} loading={resetSaving} disabled={resetPassword.length < 8}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Kios Modal */}
      {editKiosUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-1 font-subheading text-lg font-bold text-slate-800 dark:text-slate-200">Edit Kios</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Untuk: {editKiosUser.name}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Pilih Kios</label>
              <select value={editKiosId} onChange={(e) => setEditKiosId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <option value="">Pilih kios...</option>
                {kiosList.map((k) => (
                  <option key={k.kios_id} value={k.kios_id}>{k.kios_id} - {k.kios_name}</option>
                ))}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditKiosUser(null)}>Batal</Button>
              <Button onClick={handleEditKios} loading={editKiosSaving} disabled={!editKiosId}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
