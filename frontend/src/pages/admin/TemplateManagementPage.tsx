import { useState, useEffect, useRef } from 'react';
import { Plus, Shield } from 'lucide-react';
import { templateService } from '../../services/templateService';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Template } from '../../types';

const VARIABLE_BUTTONS = [
  { key: '#no_contract', label: 'No Contract' },
  { key: '#nama', label: 'Nama Customer' },
  { key: '#namapanggilanakun', label: 'Nama Kamu' },
  { key: '#obj_desc', label: 'Tipe Motor' },
  { key: '#tahun', label: 'Tahun Motor' },
  { key: '#plafon', label: 'Plafon' },
  { key: '#sisa_angsuran', label: 'Sisa Angsuran' },
  { key: '#waktu', label: 'Waktu (Pagi/Siang/Sore/Malam)' },
];

export function TemplateManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', message_body: '' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };

  useEffect(() => { adjustHeight(); }, [form.message_body]);

  const insertVariable = (variable: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setForm((prev) => ({ ...prev, message_body: prev.message_body + variable }));
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = form.message_body.substring(0, start) + variable + form.message_body.substring(end);
    setForm((prev) => ({ ...prev, message_body: newVal }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + variable.length;
    });
  };

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
              ref={textareaRef}
              value={form.message_body}
              onChange={(e) => setForm({ ...form, message_body: e.target.value })}
              placeholder="Tulis isi pesan di sini..."
              rows={6}
              className="w-full resize-none overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Variabel:</span>
              {VARIABLE_BUTTONS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-medium text-slate-500 shadow-sm transition-all hover:border-fif-300 hover:bg-fif-50 hover:text-fif-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-fif-500 dark:hover:bg-fif-900/20 dark:hover:text-fif-400"
                >
                  {v.label}
                </button>
              ))}
            </div>
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
