import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Store } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { TableSkeleton } from '../../components/ui/Skeleton';
import type { Kios } from '../../types';

export function KiosManagementPage() {
  const { toast } = useToast();
  const [kiosList, setKiosList] = useState<Kios[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKios, setEditingKios] = useState<Kios | null>(null);
  const [formKiosId, setFormKiosId] = useState('');
  const [formKiosName, setFormKiosName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchKios = useCallback(async () => {
    try {
      const { data } = await api.get('/kios');
      setKiosList(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKios();
  }, [fetchKios]);

  const openAdd = () => {
    setEditingKios(null);
    setFormKiosId('');
    setFormKiosName('');
    setShowModal(true);
  };

  const openEdit = (kios: Kios) => {
    setEditingKios(kios);
    setFormKiosId(kios.kios_id);
    setFormKiosName(kios.kios_name);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formKiosId.trim() || !formKiosName.trim()) {
      toast('error', 'Isi semua field');
      return;
    }
    setSaving(true);
    try {
      if (editingKios) {
        await api.put(`/admin/kios/${editingKios.id}`, { kios_id: formKiosId, kios_name: formKiosName });
        toast('success', 'Kios berhasil diupdate');
      } else {
        await api.post('/admin/kios', { kios_id: formKiosId, kios_name: formKiosName });
        toast('success', 'Kios berhasil ditambahkan');
      }
      setShowModal(false);
      fetchKios();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
      const firstError = msg?.errors ? Object.values(msg.errors)[0]?.[0] : msg?.message;
      toast('error', firstError || 'Gagal menyimpan kios');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kios: Kios) => {
    if (!confirm(`Hapus kios ${kios.kios_id} - ${kios.kios_name}?`)) return;
    try {
      await api.delete(`/admin/kios/${kios.id}`);
      toast('success', 'Kios berhasil dihapus');
      fetchKios();
    } catch {
      toast('error', 'Gagal menghapus kios');
    }
  };

  return (
    <div className="font-poppins space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Kelola Kios</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Kelola daftar kios yang tersedia</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4" />
          Tambah Kios
        </Button>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3.5">Kios ID</th>
                  <th className="px-5 py-3.5">Nama Kios</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {kiosList.map((k) => (
                  <tr key={k.id} className="transition-all duration-150 hover:bg-fif-50/50 dark:hover:bg-fif-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-fif-500" />
                        {k.kios_id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{k.kios_name}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(k)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(k)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {kiosList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">Belum ada kios</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 font-subheading text-lg font-bold text-slate-800 dark:text-slate-200">
              {editingKios ? 'Edit Kios' : 'Tambah Kios'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Kios ID</label>
                <input type="text" value={formKiosId} onChange={(e) => setFormKiosId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Contoh: 40200" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Nama Kios</label>
                <input type="text" value={formKiosName} onChange={(e) => setFormKiosName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Contoh: CRE" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
              <Button onClick={handleSave} loading={saving}>
                {editingKios ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
