import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Send, Save, Loader2, Clock, Plus, Trash2, RotateCw, ChevronDown, CheckCircle2 } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { broadcastService } from '../../services/broadcastService';
import { templateService } from '../../services/templateService';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import type { Customer, Template } from '../../types';

const VARIABLE_BUTTONS = [
  { key: '#no_contract', label: 'No Contract' },
  { key: '#nama', label: 'Nama' },
  { key: '#obj_desc', label: 'Obj Desc' },
  { key: '#tahun', label: 'Tahun' },
  { key: '#plafon', label: 'Plafon' },
  { key: '#sisa_angsuran', label: 'Sisa Angsuran' },
];

const MAX_BATCH = 100;
const PER_PAGE = 50;

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  if (total > 1) pages.push(total);
  return pages;
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ProspectListPage() {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [delayMin, setDelayMin] = useState(30);
  const [delayMax, setDelayMax] = useState(120);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveModal, setSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const abortRef = useRef(false);
  const [addModal, setAddModal] = useState(false);
  const [newNoContract, setNewNoContract] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDynamicFields, setNewDynamicFields] = useState<{ key: string; value: string }[]>(() => [
    { key: 'obj_desc', value: '' },
    { key: 'tahun', value: '' },
    { key: 'plafon', value: '' },
    { key: 'sisa_angsuran', value: '' },
  ]);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sentClickedIds, setSentClickedIds] = useState<number[]>([]);
  const [bussUnitFilter, setBussUnitFilter] = useState('');
  const [showBussUnitDropdown, setShowBussUnitDropdown] = useState(false);
  const bussUnitRef = useRef<HTMLDivElement>(null);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleNoContractChange = (val: string) => {
    setNewNoContract(val);
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    if (val.trim().length < 3) return;
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const c = await customerService.getByNoContract(val.trim());
        if (!c) return;
        setNewName(c.name);
        setNewPhone(c.phone_number);
        const dd = c.dynamic_data || {};
        const incoming = Object.entries(dd)
          .filter(([k]) => k !== '_entry_source' && k !== 'no_contract')
          .map(([key, value]) => ({ key, value }));
        const defaults = [
          { key: 'obj_desc', value: '' },
          { key: 'tahun', value: '' },
          { key: 'plafon', value: '' },
          { key: 'sisa_angsuran', value: '' },
        ];
        const merged = defaults.map((d) => {
          const match = incoming.find((f) => f.key === d.key);
          return match || d;
        });
        for (const f of incoming) {
          if (!merged.some((m) => m.key === f.key)) merged.push(f);
        }
        setNewDynamicFields(merged);
        toast('success', 'Data ditemukan, form terisi otomatis');
      } catch {
        // not found — biarkan user isi manual
      }
    }, 100);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.getAssignedToMe({ page: page.toString(), search, per_page: String(PER_PAGE), buss_unit: bussUnitFilter });
      setCustomers(res.data);
      setLastPage(res.last_page || 1);
    } catch {
      setCustomers([]);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, bussUnitFilter]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await templateService.getAll();
      setTemplates(Array.isArray(res) ? res : []);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => () => { if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current); }, []);

  useEffect(() => { setPage(1); }, [bussUnitFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bussUnitRef.current && !bussUnitRef.current.contains(e.target as Node)) {
        setShowBussUnitDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateBody;
    const before = text.substring(0, start);
    const after = text.substring(end);
    setTemplateBody(before + variable + after);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  };

  const interpolateMessage = (customer: Customer): string => {
    const dd = customer.dynamic_data || {};
    return templateBody
      .replace(/#no_contract/g, dd.no_contract || '')
      .replace(/#nama/g, dd.nama || customer.name || '')
      .replace(/#obj_desc/g, dd.obj_desc || '')
      .replace(/#tahun/g, dd.tahun || '')
      .replace(/#plafon/g, dd.plafon || '')
      .replace(/#sisa_angsuran/g, dd.sisa_angsuran || '');
  };

  const handleDeleteManual = async (customer: Customer) => {
    if (!window.confirm(`Hapus customer "${customer.name}"?`)) return;
    setDeletingId(customer.id);
    try {
      await customerService.deleteManual(customer.id);
      toast('success', 'Customer berhasil dihapus');
      fetchData();
    } catch {
      toast('error', 'Gagal menghapus customer');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBatchSend = async () => {
    if (!templateBody.trim()) {
      toast('error', 'Tulis template terlebih dahulu');
      return;
    }
    if (selectedIds.length === 0) {
      toast('error', 'Pilih minimal 1 customer');
      return;
    }
    if (selectedIds.length > MAX_BATCH) {
      toast('error', `Maksimal ${MAX_BATCH} customer per broadcast`);
      return;
    }

    setSendingBatch(true);
    setBatchProgress(0);
    abortRef.current = false;

    let success = 0;
    let failed = 0;
    const BATCH_SIZE = 10;
    const BATCH_PAUSE_MS = 120_000;

    for (let i = 0; i < selectedIds.length; i++) {
      if (abortRef.current) break;

      const customer = customers.find((c) => c.id === selectedIds[i]);
      if (!customer) continue;

      try {
        const message = interpolateMessage(customer);
        await broadcastService.prepare(customer.id, message, {});
        success++;
      } catch (e: unknown) {
        const resp = (e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
        const firstErr = resp?.errors ? Object.values(resp.errors).flat()[0] : null;
        if (firstErr || resp?.message) toast('error', `${customer.name}: ${firstErr || resp?.message}`);
        failed++;
      }

      setBatchProgress(i + 1);

      if (i < selectedIds.length - 1) {
        const ms = randomDelay(delayMin, delayMax);
        await sleep(ms);
      }

      if ((i + 1) % BATCH_SIZE === 0 && i < selectedIds.length - 1) {
        toast('info', `Jeda 2 menit setelah ${i + 1} pesan...`);
        await sleep(BATCH_PAUSE_MS);
      }
    }

    setSendingBatch(false);
    setSelectedIds([]);
    fetchData();
    toast('success', `Selesai: ${success} berhasil, ${failed} gagal`);
  };

  const handleSaveTemplate = async () => {
    if (!saveTitle.trim() || !templateBody.trim()) return;
    setSaving(true);
    try {
      await templateService.create({ title: saveTitle.trim(), message_body: templateBody });
      toast('success', 'Template berhasil disimpan');
      setSaveModal(false);
      setSaveTitle('');
      fetchTemplates();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Gagal menyimpan template';
      toast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!window.confirm('Hapus template ini?')) return;
    setDeletingTemplate(true);
    try {
      await templateService.delete(selectedTemplateId);
      toast('success', 'Template berhasil dihapus');
      setSelectedTemplateId(null);
      fetchTemplates();
    } catch {
      toast('error', 'Gagal menghapus template');
    } finally {
      setDeletingTemplate(false);
    }
  };

  const loadTemplate = (templateId: number) => {
    const t = templates.find((tmpl) => tmpl.id === templateId);
    if (t) {
      setTemplateBody(t.message_body);
    }
  };

  const addDynamicRow = () => {
    setNewDynamicFields([...newDynamicFields, { key: '', value: '' }]);
  };

  const removeDynamicRow = (index: number) => {
    setNewDynamicFields(newDynamicFields.filter((_, i) => i !== index));
  };

  const updateDynamicField = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...newDynamicFields];
    updated[index] = { ...updated[index], [field]: val };
    setNewDynamicFields(updated);
  };

  const handleAddCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast('error', 'Nama dan nomor telepon wajib diisi');
      return;
    }
    setAdding(true);
    try {
      const dynamic_data: Record<string, string> = {};
      if (newNoContract.trim()) {
        dynamic_data['no_contract'] = newNoContract.trim();
      }
      for (const f of newDynamicFields) {
        if (f.key.trim()) {
          dynamic_data[f.key.trim()] = f.value;
        }
      }
      await customerService.marketingAdd({
        name: newName.trim(),
        phone_number: newPhone.trim(),
        dynamic_data: Object.keys(dynamic_data).length > 0 ? dynamic_data : undefined,
      });
      toast('success', 'Customer berhasil ditambahkan');
      setAddModal(false);
      setNewNoContract('');
      setNewName('');
      setNewPhone('');
      setNewDynamicFields([
        { key: 'obj_desc', value: '' },
        { key: 'tahun', value: '' },
        { key: 'plafon', value: '' },
        { key: 'sisa_angsuran', value: '' },
      ]);
      fetchData();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
      const firstErr = resp?.errors ? Object.values(resp.errors).flat()[0] : null;
      toast('error', firstErr || resp?.message || (err as Error)?.message || 'Gagal menambah customer');
    } finally {
      setAdding(false);
    }
  };

  const dyn = (c: Customer, key: string) => (c.dynamic_data?.[key] ?? '') as string;

  const rupiah = (val: string) => {
    if (!val) return '-';
    const num = val.replace(/[^0-9]/g, '');
    if (!num) return val;
    return `Rp${Number(num).toLocaleString('id-ID')}`;
  };

  const waLink = (c: Customer) => {
    const phone = c.phone_number.replace(/[^0-9]/g, '');
    const normalized = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    const message = interpolateMessage(c);
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: 'Tertunda',
      processing: 'Diproses',
      sent: 'Terkirim',
      failed: 'Gagal',
    };
    return map[s] || s;
  };

  const statusVariant = (s: string) => {
    const map: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
      pending: 'warning',
      processing: 'info',
      sent: 'success',
      failed: 'danger',
    };
    return map[s] || 'default';
  };

  const columns = [
    { key: 'no_contract', header: 'No Contract', render: (c: Customer) => (
      <span className="font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">{c.no_contract || dyn(c, 'no_contract')}</span>
    ) },
    { key: 'nama', header: 'Nama', render: (c: Customer) => (
      <div className="flex items-center gap-1">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fif-100 to-fif-200 text-[9px] font-bold text-fif-700 dark:from-fif-800 dark:to-fif-900 dark:text-fif-300">
          {(dyn(c, 'nama') || c.name).charAt(0).toUpperCase()}
        </div>
        <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{dyn(c, 'nama') || c.name}</span>
        {dyn(c, '_entry_source') === 'manual' && (
          <span className="shrink-0 rounded bg-purple-100 px-1 py-[1px] text-[8px] font-semibold uppercase text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">M</span>
        )}
      </div>
    ) },
    { key: 'obj_desc', header: 'Obj Desc', render: (c: Customer) => (
      <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{dyn(c, 'obj_desc') || '-'}</span>
    ) },
    { key: 'tahun', header: 'Tahun', render: (c: Customer) => (
      <span className="text-[11px] text-slate-600 dark:text-slate-400">{dyn(c, 'tahun') || '-'}</span>
    ) },
    {
      key: 'buss_unit',
      header: (
        <div className="relative inline-flex items-center gap-1">
          <span>Buss Unit</span>
          <div ref={bussUnitRef} className="relative">
            <button
              onClick={() => setShowBussUnitDropdown((p) => !p)}
              className={`rounded p-0.5 transition-colors ${bussUnitFilter ? 'text-fif-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showBussUnitDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showBussUnitDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1 min-w-[110px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 shadow-lg">
                {['', 'NMC', 'REFI'].map((val) => {
                  const active = val ? bussUnitFilter === val : !bussUnitFilter;
                  return (
                    <button
                      key={val}
                      onClick={() => {
                        setBussUnitFilter(val);
                        setShowBussUnitDropdown(false);
                        setPage(1);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                        active
                          ? 'bg-fif-50 text-fif-700 dark:bg-fif-900/20 dark:text-fif-300'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {val || 'Semua'}
                      {active && <CheckCircle2 className="ml-auto h-3 w-3 text-fif-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ),
      render: (c: Customer) => (
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{dyn(c, 'buss_unit') || '-'}</span>
    ) },
    { key: 'plafon', header: 'Plafon', render: (c: Customer) => (
      <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{rupiah(dyn(c, 'plafon'))}</span>
    ) },
    { key: 'sisa_angsuran', header: 'Sisa Angsuran', render: (c: Customer) => (
      <span className="font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">{dyn(c, 'sisa_angsuran') || '-'}</span>
    ) },
    {
      key: 'status', header: 'Status', render: (c: Customer) => {
        const latest = c.broadcast_histories?.[0];
        if (!latest) return <span className="text-[10px] text-slate-400 dark:text-slate-500">&mdash;</span>;
        return <Badge variant={statusVariant(latest.status)} size="sm">{statusLabel(latest.status)}</Badge>;
      }
    },
    {
      key: 'aksi', header: 'Aksi', render: (c: Customer) => {
        const marked = sentClickedIds.includes(c.id);
        return (
          <div className="flex items-center justify-center gap-0.5">
            {marked ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white" title="Sudah dikirim">
                <Send className="h-3 w-3" />
              </span>
            ) : (
              <a
                href={waLink(c)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSentClickedIds((prev) => prev.includes(c.id) ? prev : [...prev, c.id])}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 transition-all hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                title="Buka WhatsApp"
              >
                <Send className="h-3 w-3" />
              </a>
            )}
            {dyn(c, '_entry_source') === 'manual' && (
              <button
                onClick={() => handleDeleteManual(c)}
                disabled={deletingId === c.id}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Hapus"
              >
                {deletingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Broadcast</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Buat template dan kirim pesan ke customer</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="border-b border-slate-50 px-5 py-3.5 dark:border-slate-700/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Template Tersimpan</label>
              <select
                value={selectedTemplateId ?? ''}
                onChange={(e) => { const v = e.target.value; if (v) { const id = parseInt(v); setSelectedTemplateId(id); loadTemplate(id); } else { setSelectedTemplateId(null); } }}
                className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:bg-white focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus:bg-slate-700"
              >
                <option value="">-- Pilih Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Save className="h-3.5 w-3.5" />}
                onClick={() => { setSaveTitle(''); setSaveModal(true); }}
                disabled={!templateBody.trim()}
              >
                Simpan
              </Button>
              {selectedTemplateId && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={handleDeleteTemplate}
                  loading={deletingTemplate}
                >
                  Hapus
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="p-5">
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Template Pesan</label>
          <textarea
            ref={textareaRef}
            value={templateBody}
            onChange={(e) => setTemplateBody(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-fif-500 focus:bg-white focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus:bg-slate-700"
            placeholder="Tulis template broadcast di sini... Contoh: Halo #nama, angsuran anda #plafon"
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Variabel:</span>
            {VARIABLE_BUTTONS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-medium text-slate-500 shadow-sm transition-all hover:border-fif-300 hover:bg-fif-50 hover:text-fif-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-fif-500 dark:hover:bg-fif-900/20 dark:hover:text-fif-400"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white px-5 py-3.5 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Jeda Waktu</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Min</label>
            <input
              type="number"
              min={30}
              max={60}
              value={delayMin}
              onChange={(e) => setDelayMin(Math.max(30, parseInt(e.target.value) || 30))}
              className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-center outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700"
            />
            <span className="text-xs text-slate-400">dtk</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Max</label>
            <input
              type="number"
              min={30}
              max={300}
              value={delayMax}
              onChange={(e) => setDelayMax(Math.max(30, parseInt(e.target.value) || 30))}
              className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-center outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700"
            />
            <span className="text-xs text-slate-400">dtk</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Jeda acak per pesan + jeda 2 menit tiap 10 pesan
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari No. Contract, Nama, atau No. WA..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500"
          />
        </div>
        {sentClickedIds.length > 0 && (
          <button
            onClick={() => setSentClickedIds([])}
            className="group flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-600"
            title={`Reset tanda kirim (${sentClickedIds.length} ditandai)`}
          >
            <RotateCw className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
          </button>
        )}
        <button
          onClick={() => {
            setNewNoContract('');
            setNewName('');
            setNewPhone('');
            setNewDynamicFields([
              { key: 'obj_desc', value: '' },
              { key: 'tahun', value: '' },
              { key: 'plafon', value: '' },
              { key: 'sisa_angsuran', value: '' },
            ]);
            setAddModal(true);
          }}
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-fif-500 to-fif-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-fif-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-fif-300/50 hover:brightness-110 active:scale-[0.97] dark:shadow-fif-900/30 dark:hover:shadow-fif-800/40"
        >
          <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
          Tambah Customer
        </button>
      </div>

      {sendingBatch && (
        <div className="overflow-hidden rounded-lg border border-fif-100 bg-fif-50/80 dark:border-fif-800/50 dark:bg-fif-900/10">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-fif-600 dark:text-fif-400" />
              <p className="text-sm font-medium text-fif-700 dark:text-fif-300">
                Mengirim {batchProgress} dari {selectedIds.length}...
              </p>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-fif-200/70 dark:bg-fif-800/50">
              <div
                className="h-full rounded-full bg-fif-500 transition-all duration-500 ease-out"
                style={{ width: `${(batchProgress / selectedIds.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && !sendingBatch && (
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedIds.length}</span> customer dipilih
            {selectedIds.length > MAX_BATCH && (
              <span className="ml-1 text-red-500">(maks {MAX_BATCH})</span>
            )}
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={<Send className="h-3.5 w-3.5" />}
            onClick={handleBatchSend}
            disabled={selectedIds.length > MAX_BATCH || selectedIds.length === 0}
          >
            Kirim ({selectedIds.length})
          </Button>
        </div>
      )}

      <DataTable
        columns={columns} data={customers} loading={loading}
        showCheckbox
        selectedIds={selectedIds}
        markedIds={sentClickedIds}
        onSelect={(id) => setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )}
        onSelectAll={() => {
          const allCurrentPageSelected = customers.every((c) => selectedIds.includes(c.id));
          if (allCurrentPageSelected) {
            setSelectedIds((prev) => prev.filter((id) => !customers.some((c) => c.id === id)));
          } else {
            setSelectedIds((prev) => {
              const newIds = [...prev];
              for (const c of customers) {
                if (!newIds.includes(c.id)) newIds.push(c.id);
              }
              const maxReached = newIds.length > MAX_BATCH;
              if (maxReached) {
                toast('warning', `Maksimal ${MAX_BATCH} customer dapat dipilih`);
                return newIds.slice(0, MAX_BATCH);
              }
              return newIds;
            });
          }
        }}
        allPageSelected={customers.length > 0 && customers.every((c) => selectedIds.includes(c.id))}
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">Halaman {page} dari {lastPage}</span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1 || sendingBatch}
            onClick={() => { setPage(page - 1); setSelectedIds([]); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            &lt;
          </button>
          {getPageRange(page, lastPage).map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">...</span>
            ) : (
              <button
                key={p}
                disabled={sendingBatch}
                onClick={() => { setPage(p); setSelectedIds([]); }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  p === page
                    ? 'bg-fif-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            disabled={page >= lastPage || sendingBatch}
            onClick={() => { setPage(page + 1); setSelectedIds([]); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            &gt;
          </button>
        </div>
      </div>

      <Modal open={saveModal} onClose={() => setSaveModal(false)} title="Simpan Template">
        <div className="space-y-4">
          <Input
            label="Nama Template"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder="Contoh: Template Angsuran 1"
          />
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-1">Isi Pesan:</p>
            <p className="whitespace-pre-wrap">{templateBody}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setSaveModal(false)}>Batal</Button>
            <Button onClick={handleSaveTemplate} disabled={!saveTitle.trim() || saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Tambah Customer" size="lg">
        <div className="space-y-4">
          <Input label="No Contract" value={newNoContract} onChange={(e) => handleNoContractChange(e.target.value)} placeholder="Ketik No Contract — akan auto-fill jika sudah ada" />
          <Input label="Nama" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama customer" />
          <Input label="Nomor WhatsApp / Telepon" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="08xxxxxxxxxx" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data Tambahan</label>
              <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addDynamicRow}>
                Tambah Field
              </Button>
            </div>
            {newDynamicFields.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada data tambahan. Klik "Tambah Field" untuk menambahkan kolom custom.</p>
            )}
            <div className="space-y-2">
              {newDynamicFields.map((field, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateDynamicField(i, 'key', e.target.value)}
                    placeholder="Nama field (contoh: no_contract)"
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateDynamicField(i, 'value', e.target.value)}
                    placeholder="Nilai"
                    className="flex-[2] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeDynamicRow(i)}
                    className="mt-1.5 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)}>Batal</Button>
            <Button onClick={handleAddCustomer} disabled={adding} loading={adding}>
              {adding ? 'Menambah...' : 'Tambah'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
