import { useState, useEffect } from 'react';
import { Plus, Shield } from 'lucide-react';
import { templateService } from '../../services/templateService';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Template } from '../../types';

export function TemplateManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', message_body: '' });

  useEffect(() => {
    templateService.getAll().then((data) => { setTemplates(data); setLoading(false); });
  }, []);

  const handleSave = async () => {
    try {
      if (editId) {
        await templateService.update(editId, form);
        toast('success', 'Template berhasil diperbarui');
      } else {
        await templateService.create(form);
        toast('success', 'Template berhasil ditambahkan');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ title: '', message_body: '' });
      const data = await templateService.getAll();
      setTemplates(data);
    } catch {
      toast('error', 'Gagal menyimpan template');
    }
  };

  const handleEdit = (t: Template) => {
    setForm({ title: t.title, message_body: t.message_body });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleDelete = async (t: Template) => {
    try {
      await templateService.delete(t.id);
      toast('success', `Template "${t.title}" berhasil dihapus`);
      const data = await templateService.getAll();
      setTemplates(data);
    } catch {
      toast('error', 'Gagal menghapus template');
    }
  };

  const columns = [
    {
      key: 'title', header: 'Title', render: (t: Template) => (
        <div className="flex items-center gap-2">
          <span>{t.title}</span>
          {t.is_default ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-fif-100 px-2 py-0.5 text-xs font-medium text-fif-700">
              <Shield className="h-3 w-3" /> Default
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: 'message_body', header: 'Message', render: (t: Template) => (
        <div className="max-w-md truncate text-slate-500 dark:text-slate-400">{t.message_body}</div>
      )
    },
    { key: 'creator', header: 'Created By', render: (t: Template) => t.creator?.name || '-' },
  ];

  const canEdit = (t: Template) => isSuperadmin || !t.is_default;
  const canDelete = (t: Template) => isSuperadmin || !t.is_default;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Template Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola template pesan WhatsApp</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', message_body: '' }); }}
        >
          Tambah
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={templates}
        loading={loading}
        onEdit={(t) => canEdit(t) ? handleEdit(t) : undefined}
        onDelete={(t) => canDelete(t) ? handleDelete(t) : undefined}
        editDisabled={(t) => !canEdit(t)}
        deleteDisabled={(t) => !canDelete(t)}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Template' : 'Tambah Template'} size="lg">
        <div className="space-y-4">
          <Input label="Judul Template" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mis: Tagihan 1" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Isi Pesan</label>
            <textarea
              value={form.message_body}
              onChange={(e) => setForm({ ...form, message_body: e.target.value })}
              placeholder="Gunakan #nama, #plat, #nomor_contract, #angsuran_kurang, #namapanggilanakun dll..."
              rows={5}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
            />
            <p className="text-xs text-slate-400">Gunakan <code>#namapanggilanakun</code> untuk nama pengirim broadcast</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
