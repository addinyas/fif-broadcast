import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Send, Save, Loader2, Plus, Trash2, RotateCw, ChevronDown, CheckCircle2, History, Users, WifiOff, Smartphone, ArrowLeftRight, UserIcon, AlertTriangle, Settings, MessageCircle, CheckCheck } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { broadcastService } from '../../services/broadcastService';
import { templateService } from '../../services/templateService';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { calcPlafon } from '../../finance/financeEngine';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { RollingDataModal } from '../../components/ui/RollingDataModal';
import { useToast } from '../../components/ui/Toast';
import type { Customer, Template, User } from '../../types';

const VARIABLE_BUTTONS = [
  { key: '#no_contract', label: 'No Contract' },
  { key: '#nama', label: 'Nama Customer' },
  { key: '#nomor', label: 'Nomor Kamu' },
  { key: '#namapanggilan', label: 'Nama Kamu' },
  { key: '#obj_desc', label: 'Tipe Motor' },
  { key: '#tahun', label: 'Tahun Motor' },
  { key: '#plafon', label: 'Plafon' },
  { key: '#sisa_angsuran', label: 'Sisa Angsuran' },
  { key: '#waktu', label: 'Waktu' },
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

export function ProspectListPage() {
  const { toast } = useToast();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStats, setBatchStats] = useState({ sent: 0, failed: 0, pending: 0 });
  const [saveModal, setSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const abortRef = useRef(false);
  const wasSendingRef = useRef(false);
  const skipAutoAdvanceRef = useRef(false);
  const [addModal, setAddModal] = useState(false);
  const [newNoContract, setNewNoContract] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDynamicFields, setNewDynamicFields] = useState<{ key: string; value: string }[]>(() => [
    { key: 'obj_desc', value: '' },
    { key: 'tahun', value: '' },
    { key: 'otr', value: '' },
    { key: 'cori', value: '' },
    { key: 'sisa_angsuran', value: '' },
  ]);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sentIds, setSentIds] = useState<number[]>([]);
  const [refreshingSent, setRefreshingSent] = useState(false);
  const [customerTypeFilter, setBussUnitFilter] = useState('');
  const [showCustomerTypeDropdown, setShowBussUnitDropdown] = useState(false);
  const customerTypeRef = useRef<HTMLDivElement>(null);
  const [sisaAngsuranFilter, setSisaAngsuranFilter] = useState('');
  const [showSisaAngsuranDropdown, setShowSisaAngsuranDropdown] = useState(false);
  const sisaAngsuranRef = useRef<HTMLDivElement>(null);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [showRollingModal, setShowRollingModal] = useState(false);
  const [marketingUsers, setMarketingUsers] = useState<User[]>([]);
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'own' | 'shared'>('all');
  const [showOwnershipDropdown, setShowOwnershipDropdown] = useState(false);
  const ownershipRef = useRef<HTMLDivElement>(null);
  const [useDefaultTemplate, setUseDefaultTemplate] = useState(false);

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
          { key: 'otr', value: '' },
          { key: 'cori', value: '' },
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
      const res = await customerService.getAssignedToMe({ page: page.toString(), search, per_page: String(PER_PAGE), customer_type: customerTypeFilter, sisa_angsuran: sisaAngsuranFilter, ownership: ownershipFilter });
      setCustomers(res.data);
      setLastPage(res.last_page || 1);
      setSentIds(res.data.filter((c) => user?.role === 'UH' ? c.manual_sent_by === user?.id : !!c.manual_sent_at).map((c) => c.id));

      if (!skipAutoAdvanceRef.current && res.data.length > 0 && res.data.every((c) => c.manual_sent_at) && page < (res.last_page || 1)) {
        setPage((p) => p + 1);
      } else {
        skipAutoAdvanceRef.current = false;
      }
    } catch {
      setCustomers([]);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, customerTypeFilter, sisaAngsuranFilter, ownershipFilter]);

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

  useEffect(() => { adjustHeight(); }, [templateBody]);

  const previewMessage = (() => {
    if (!templateBody) return '';
    const hour = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false });
    const h = parseInt(hour, 10);
    const waktu = h >= 4 && h < 11 ? 'Pagi' : h >= 11 && h < 15 ? 'Siang' : h >= 15 && h < 18 ? 'Sore' : 'Malam';
    return templateBody
      .replace(/#namapanggilan/g, user?.display_name || user?.name || '...')
      .replace(/#waktu/g, waktu);
  })();

  useEffect(() => {
    if (useDefaultTemplate) {
      const defaultT = templates.find((t) => t.is_default);
      if (defaultT) {
        setSelectedTemplateId(defaultT.id);
        setTemplateBody(defaultT.message_body);
      }
    }
  }, [useDefaultTemplate, templates]);

  const fetchMarketingUsers = useCallback(async () => {
    try {
      const data = await customerService.getMarketingUsers();
      setMarketingUsers(data as User[]);
    } catch {
      setMarketingUsers([]);
    }
  }, []);

  useEffect(() => { fetchMarketingUsers(); }, [fetchMarketingUsers]);
  useEffect(() => () => { if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current); }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    socket.emit('wa:request_status');
    const handler = (data: { status: string }) => {
      setWaStatus(data.status);
    };
    socket.on('wa:status', handler);
    return () => { socket.off('wa:status', handler); };
  }, [token]);

  useEffect(() => { setPage(1); }, [customerTypeFilter, sisaAngsuranFilter, ownershipFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerTypeRef.current && !customerTypeRef.current.contains(e.target as Node)) {
        setShowBussUnitDropdown(false);
      }
      if (sisaAngsuranRef.current && !sisaAngsuranRef.current.contains(e.target as Node)) {
        setShowSisaAngsuranDropdown(false);
      }
      if (ownershipRef.current && !ownershipRef.current.contains(e.target as Node)) {
        setShowOwnershipDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!sendingBatch) return;
    const interval = setInterval(async () => {
      try {
        const res = await broadcastService.getHistory({ per_page: '1' });
        const meta = res as unknown as { stats?: { sent: number; failed: number; pending: number; processing: number } };
        if (meta.stats) {
          const pending = meta.stats.pending + meta.stats.processing;
          setBatchStats({ sent: meta.stats.sent, failed: meta.stats.failed, pending });
          if (pending === 0 && (meta.stats.sent > 0 || meta.stats.failed > 0)) {
            setSendingBatch(false);
          }
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [sendingBatch]);

  useEffect(() => {
    if (sendingBatch) {
      wasSendingRef.current = true;
      return;
    }
    if (wasSendingRef.current) {
      wasSendingRef.current = false;
      if (customers.length > 0 && customers.every((c) => sentIds.includes(c.id)) && page < lastPage) {
        setPage((p) => p + 1);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendingBatch]);

  useEffect(() => {
    if (!sendingBatch) return;
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = (data: { status: string }) => {
      if (data.status === 'disconnected' || data.status === 'logged_out') {
        abortRef.current = true;
        toast('warning', 'WhatsApp terputus! Sisa pesan akan dikirim ulang setelah koneksi pulih.');
      }
    };

    socket.on('wa:status', handler);
    return () => { socket.off('wa:status', handler); };
  }, [sendingBatch, toast, token]);

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
    const hour = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false });
    const h = parseInt(hour, 10);
    const waktu = h >= 4 && h < 11 ? 'Pagi' : h >= 11 && h < 15 ? 'Siang' : h >= 15 && h < 18 ? 'Sore' : 'Malam';
    return templateBody
      .replace(/#nomor_contract/g, dd.nomor_contract || dd.no_contract || '')
      .replace(/#no_contract/g, dd.no_contract || '')
      .replace(/#nomor/g, user?.phone_number || '')
      .replace(/#namapanggilan/g, user?.display_name || user?.name || '')
      .replace(/#nama/g, dd.nama || customer.name || '')
      .replace(/#motor_dan_tahun/g, dd.motor_dan_tahun || '')
      .replace(/#plat/g, dd.plat || '')
      .replace(/#obj_desc/g, dd.obj_desc || '')
      .replace(/#tahun/g, dd.tahun || '')
      .replace(/#plafon/g, calcPlafon(dd.otr, dd.cori) ? Number(calcPlafon(dd.otr, dd.cori)).toLocaleString('id-ID') : '')
      .replace(/#angsuran_kurang/g, dd.angsuran_kurang || '')
      .replace(/#input_angsuran/g, dd.input_angsuran || '')
      .replace(/#dinego_jadi/g, dd.dinego_jadi || '')
      .replace(/#pinjaman/g, dd.pinjaman || '')
      .replace(/#pelunasan/g, dd.pelunasan || '')
      .replace(/#terima/g, dd.terima || '')
      .replace(/#tenor/g, dd.tenor || '')
      .replace(/#sisa_angsuran/g, dd.sisa_angsuran || '')
      .replace(/#waktu/g, waktu);
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
    setBatchStats({ sent: 0, failed: 0, pending: 0 });
    abortRef.current = false;

    let success = 0;
    let failed = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      if (abortRef.current) break;

      const customer = customers.find((c) => c.id === selectedIds[i]);
      if (!customer) continue;

      try {
        const message = interpolateMessage(customer);
        await broadcastService.prepare(customer.id, message, {});
        await customerService.markSent(customer.id).catch(() => {});
        setSentIds((prev) => prev.includes(customer.id) ? prev : [...prev, customer.id]);
        success++;
      } catch (e: unknown) {
        const resp = (e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
        const firstErr = resp?.errors ? Object.values(resp.errors).flat()[0] : null;
        if (firstErr || resp?.message) toast('error', `${customer.name}: ${firstErr || resp?.message}`);
        failed++;
      }

      setBatchProgress(i + 1);
    }

    setSelectedIds([]);
    fetchData();

    if (success === 0) {
      setSendingBatch(false);
      toast('error', `Gagal menyiapkan pesan: ${failed} error`);
    } else {
      toast('success', `Siap dikirim: ${success} pesan. Worker akan mengirim dalam beberapa menit.`);
    }
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
        { key: 'otr', value: '' },
        { key: 'cori', value: '' },
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

  const handleManualSend = async (c: Customer) => {
    try {
      await customerService.markSent(c.id);
      setSentIds((prev) => {
        const updated = prev.includes(c.id) ? prev : [...prev, c.id];
        if (customers.every((cust) => updated.includes(cust.id)) && page < lastPage) {
          setPage(page + 1);
        }
        return updated;
      });
      toast('success', 'Tanda kirim tersimpan');
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e as Error)?.message || 'Gagal menyimpan tanda kirim';
      toast('error', msg);
    }
    window.open(waLink(c), '_blank', 'noopener');
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
      <span className="font-satoshi text-xs font-medium text-slate-700 dark:text-slate-300">{c.no_contract || dyn(c, 'no_contract')}</span>
    ) },
    { key: 'nama', header: 'Nama', render: (c: Customer) => (
      <div className="flex items-center gap-1">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fif-100 to-fif-200 text-xs font-bold text-fif-700 dark:from-fif-800 dark:to-fif-900 dark:text-fif-300">
          {(dyn(c, 'nama') || c.name).charAt(0).toUpperCase()}
        </div>
        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{dyn(c, 'nama') || c.name}</span>
        {c.from_marketing_name && (
          <span className="shrink-0 rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">Dipinjam</span>
        )}
        {dyn(c, '_entry_source') === 'manual' && (
          <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">M</span>
        )}
      </div>
    ) },
    { key: 'pemilik', header: 'Pemilik', render: (c: Customer) => {
      const isShared = !!c.from_marketing_name;
      return (
        <div className="flex items-center gap-1.5">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            isShared
              ? 'bg-gradient-to-br from-cyan-100 to-teal-100 text-cyan-700 dark:from-cyan-900/40 dark:to-teal-900/40 dark:text-cyan-300'
              : 'bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 dark:from-violet-900/40 dark:to-purple-900/40 dark:text-violet-300'
          }`}>
            {isShared ? <ArrowLeftRight className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
          </div>
          {isShared ? (
            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">{c.from_marketing_name}</span>
          ) : (
            <span className="rounded-md bg-gradient-to-r from-violet-500 to-purple-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">Anda</span>
          )}
        </div>
      );
    } },
    { key: 'obj_desc', header: 'Tipe Motor', render: (c: Customer) => (
      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{dyn(c, 'obj_desc') || '-'}</span>
    ) },
    { key: 'tahun', header: 'Tahun Motor', render: (c: Customer) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">{dyn(c, 'tahun') || '-'}</span>
    ) },
    {
      key: 'buss_unit',
      header: (
        <div className="relative inline-flex items-center gap-1">
          <span>Tipe</span>
          <div ref={customerTypeRef} className="relative">
            <button
              onClick={() => setShowBussUnitDropdown((p) => !p)}
              className={`rounded p-0.5 transition-colors ${customerTypeFilter ? 'text-fif-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showCustomerTypeDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCustomerTypeDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1 min-w-[110px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 shadow-lg">
                {['', 'NMC', 'REFI'].map((val) => {
                  const active = val ? customerTypeFilter === val : !customerTypeFilter;
                  return (
                    <button
                      key={val}
                      onClick={() => {
                        setBussUnitFilter(val);
                        setShowBussUnitDropdown(false);
                        setPage(1);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-fif-50 text-fif-700 dark:bg-fif-900/20 dark:text-fif-300'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {val || 'Semua'}
                      {active && <CheckCircle2 className="ml-auto h-4 w-4 text-fif-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ),
      render: (c: Customer) => (
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{dyn(c, 'buss_unit') || '-'}</span>
    ) },
    { key: 'plafon', header: 'Plafon', render: (c: Customer) => (
      <span className="font-satoshi text-sm font-semibold text-emerald-600 dark:text-emerald-400">{rupiah(String(calcPlafon(dyn(c, 'otr'), dyn(c, 'cori'))))}</span>
    ) },
    {
      key: 'sisa_angsuran',
      header: (
        <div className="relative inline-flex items-center gap-1">
          <span>Sisa Angsuran</span>
          <div ref={sisaAngsuranRef} className="relative">
            <button
              onClick={() => setShowSisaAngsuranDropdown((p) => !p)}
              className={`rounded p-0.5 transition-colors ${sisaAngsuranFilter ? 'text-fif-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showSisaAngsuranDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSisaAngsuranDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1 min-w-[130px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 shadow-lg">
                {['', '1-5', '6-10', '11-15'].map((val) => {
                  const active = val ? sisaAngsuranFilter === val : !sisaAngsuranFilter;
                  return (
                    <button
                      key={val}
                      onClick={() => {
                        setSisaAngsuranFilter(val);
                        setShowSisaAngsuranDropdown(false);
                        setPage(1);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-fif-50 text-fif-700 dark:bg-fif-900/20 dark:text-fif-300'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {val || 'Semua'}
                      {active && <CheckCircle2 className="ml-auto h-4 w-4 text-fif-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ),
      render: (c: Customer) => (
      <span className="font-satoshi text-sm font-semibold text-amber-600 dark:text-amber-400">{dyn(c, 'sisa_angsuran') || '-'}</span>
    ) },
    {
      key: 'status', header: 'Status', render: (c: Customer) => {
        const latest = c.broadcast_histories?.[0];
        if (!latest) return <span className="text-xs text-slate-400 dark:text-slate-500">&mdash;</span>;
        return <Badge variant={statusVariant(latest.status)} size="sm">{statusLabel(latest.status)}</Badge>;
      }
    },
    {
      key: 'aksi', header: 'Aksi',
      headerRight: (
        <button
          onClick={async () => {
            setRefreshingSent(true);
            try {
              await customerService.clearSentMarks();
              fetchData();
            } catch { /* silent */ }
            setRefreshingSent(false);
          }}
          disabled={refreshingSent}
          className="ml-1 rounded p-0.5 text-slate-400 transition-colors hover:text-fif-600 disabled:opacity-40 dark:hover:text-fif-400"
          title="Reset tanda kirim"
        >
          <RotateCw className={`h-4 w-4 ${refreshingSent ? 'animate-spin' : ''}`} />
        </button>
      ),
      render: (c: Customer) => {
        const marked = sentIds.includes(c.id);
        return (
          <div className="flex items-center justify-center gap-1">
            {marked ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-white" title="Sudah dikirim">
                <Send className="h-4 w-4" />
              </span>
            ) : (
              <button
                onClick={() => handleManualSend(c)}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 transition-all hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                title="Buka WhatsApp"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
            {dyn(c, '_entry_source') === 'manual' && (
              <button
                onClick={() => handleDeleteManual(c)}
                disabled={deletingId === c.id}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Hapus"
              >
                {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div className="font-poppins space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Broadcast</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Buat template dan kirim pesan ke customer</p>
        </div>
      </div>

      {(!user?.display_name || !user?.phone_number) && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {!user?.display_name && !user?.phone_number
                ? 'Nama Panggilan & Nomor Telepon belum diisi'
                : !user?.display_name
                  ? 'Nama Panggilan belum diatur'
                  : 'Nomor Telepon belum diisi'}
            </p>
          </div>
          <button
            onClick={() => navigate(user?.role === 'marketing' ? '/marketing/settings' : '/admin/settings')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-amber-700"
          >
            <Settings className="h-3.5 w-3.5" />
            Ke Settings
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="border-b border-slate-50 px-5 py-3.5 dark:border-slate-700/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Template Tersimpan</label>
              <div className="mt-1.5 flex items-center gap-2">
                <select
                  value={useDefaultTemplate ? 'default' : (selectedTemplateId ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'default') {
                      setUseDefaultTemplate(true);
                    } else if (v) {
                      setUseDefaultTemplate(false);
                      const id = parseInt(v);
                      setSelectedTemplateId(id);
                      loadTemplate(id);
                    } else {
                      setUseDefaultTemplate(false);
                      setSelectedTemplateId(null);
                    }
                  }}
                  className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:bg-white focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus:bg-slate-700"
                >
                  <option value="">-- Pilih Template --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <label className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  !user?.display_name || !user?.phone_number
                    ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed dark:border-slate-600 dark:bg-slate-700'
                    : 'cursor-pointer border-slate-200 bg-white text-slate-600 hover:bg-slate-50 has-checked:border-fif-500 has-checked:bg-fif-50 has-checked:text-fif-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:has-checked:border-fif-400 dark:has-checked:bg-fif-900/20 dark:has-checked:text-fif-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={useDefaultTemplate}
                    disabled={!user?.display_name || !user?.phone_number}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseDefaultTemplate(checked);
                      if (!checked) {
                        setSelectedTemplateId(null);
                        setTemplateBody('');
                      }
                    }}
                    className="sr-only"
                  />
                  {useDefaultTemplate ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
                  Default
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Save className="h-4 w-4" />}
                onClick={() => { setSaveTitle(''); setSaveModal(true); }}
                disabled={!templateBody.trim()}
              >
                Simpan
              </Button>
              {selectedTemplateId && (user?.role === 'superadmin' || !templates.find((t) => t.id === selectedTemplateId)?.is_default) && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-4 w-4" />}
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
          <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Template Pesan</label>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {VARIABLE_BUTTONS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-fif-50 px-2.5 py-1 text-xs font-medium text-fif-600 transition-colors hover:bg-fif-100 active:scale-95 dark:bg-fif-900/20 dark:text-fif-400 dark:hover:bg-fif-900/30"
              >
                {v.label}
              </button>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={templateBody}
            onChange={(e) => setTemplateBody(e.target.value)}
            rows={6}
            className="mt-3 w-full resize-none overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-fif-500 focus:bg-white focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus:bg-slate-700"
            placeholder="Tulis template broadcast di sini... Contoh: Halo #nama, angsuran anda #plafon"
          />
          {templateBody && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm dark:border-slate-600 dark:from-emerald-900/10 dark:to-teal-900/10">
              <div className="flex items-center gap-2 bg-emerald-600 px-4 py-2.5">
                <MessageCircle className="h-4 w-4 text-emerald-100" />
                <span className="text-xs font-semibold text-white">Preview Pesan</span>
                <span className="ml-auto rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-emerald-100">LIVE</span>
              </div>
              <div className="px-4 py-3">
                <div className="flex gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fif-500 to-fif-600 text-xs font-bold text-white shadow-md">
                    {(user?.display_name || user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="relative max-w-[85%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                    <p className="whitespace-pre-wrap">{previewMessage}</p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="h-3 w-3 text-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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

        <div ref={ownershipRef} className="relative">
          <button
            onClick={() => setShowOwnershipDropdown((p) => !p)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              ownershipFilter !== 'all'
                ? 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {ownershipFilter === 'all' && <Users className="h-3.5 w-3.5" />}
                {ownershipFilter === 'own' && <UserIcon className="h-3.5 w-3.5" />}
            {ownershipFilter === 'shared' && <ArrowLeftRight className="h-3.5 w-3.5" />}
            {ownershipFilter === 'all' ? 'Semua Data' : ownershipFilter === 'own' ? 'Data Saya' : 'Dipinjam'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOwnershipDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showOwnershipDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 shadow-lg">
              {([
                { value: 'all' as const, label: 'Semua Data', icon: <Users className="h-4 w-4" />, desc: 'Data sendiri + dipinjam' },
                { value: 'own' as const, label: 'Data Saya', icon: <UserIcon className="h-4 w-4" />, desc: 'Hanya data milik Anda' },
                { value: 'shared' as const, label: 'Dipinjam', icon: <ArrowLeftRight className="h-4 w-4" />, desc: 'Hanya data pinjaman' },
              ]).map((opt) => {
                const active = ownershipFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { setOwnershipFilter(opt.value); setShowOwnershipDropdown(false); setPage(1); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                      active
                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={active ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}>{opt.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{opt.desc}</div>
                    </div>
                    {active && <CheckCircle2 className="ml-auto h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/marketing/history')}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-300/50 hover:brightness-110 active:scale-[0.97] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm dark:shadow-slate-900/30 dark:hover:shadow-slate-800/40"
        >
          <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          History
        </button>
        <button
          onClick={() => setShowRollingModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-fif-500 to-fif-700 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-fif-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-fif-300/50 hover:brightness-110 active:scale-[0.97] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm dark:shadow-fif-900/30 dark:hover:shadow-fif-800/40"
        >
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Rolling Data
        </button>
      </div>

      {sendingBatch && (
        <div className="overflow-hidden rounded-xl border border-fif-100 bg-gradient-to-r from-fif-50/90 to-fif-50/50 dark:border-fif-800/50 dark:from-fif-900/20 dark:to-fif-900/10">
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-fif-600 dark:text-fif-400" />
                <p className="text-sm font-medium text-fif-700 dark:text-fif-300">
                  <span className="hidden sm:inline">Worker mengirim </span>
                  <span className="sm:hidden"></span>
                  {batchStats.sent + batchStats.failed + batchStats.pending > 0
                    ? `${batchStats.sent + batchStats.failed}/${batchStats.sent + batchStats.failed + batchStats.pending}`
                    : `${batchProgress} dikirim`}
                </p>
              </div>
              {batchStats.sent + batchStats.failed + batchStats.pending > 0 && (
                <span className="text-xs font-semibold text-fif-600 dark:text-fif-400">
                  {Math.round(((batchStats.sent + batchStats.failed) / (batchStats.sent + batchStats.failed + batchStats.pending)) * 100)}%
                </span>
              )}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-fif-200/70 dark:bg-fif-800/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fif-500 to-fif-400 transition-all duration-700 ease-out"
                style={{ width: `${batchStats.sent + batchStats.failed + batchStats.pending > 0 ? ((batchStats.sent + batchStats.failed) / (batchStats.sent + batchStats.failed + batchStats.pending)) * 100 : (batchProgress / Math.max(selectedIds.length, 1)) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> {batchStats.sent} terkirim</span>
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> {batchStats.failed} gagal</span>
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> {batchStats.pending} pending</span>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && !sendingBatch && (
        <div className="space-y-2">
          {waStatus !== 'connected' && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-900/20">
              {waStatus === 'awaiting_scan' ? (
                <Smartphone className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {waStatus === 'awaiting_scan'
                  ? 'WhatsApp sedang menunggu scan QR.'
                  : 'WhatsApp belum terhubung.'}
                {' '}<a href="/marketing/connect" className="font-semibold underline">Hubungkan sekarang</a>
              </p>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/90 px-4 py-2.5 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/80">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedIds.length}</span> customer dipilih
              {selectedIds.length > MAX_BATCH && (
                <span className="ml-1 text-red-500">(maks {MAX_BATCH})</span>
              )}
            </span>
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="h-4 w-4" />}
              onClick={handleBatchSend}
              disabled={selectedIds.length > MAX_BATCH || selectedIds.length === 0 || waStatus !== 'connected'}
            >
              Kirim ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns} data={customers} loading={loading}
        showCheckbox
        selectedIds={selectedIds}
        markedIds={sentIds}
        rowClassName={(c: Customer) => c.from_marketing_name ? 'bg-gradient-to-r from-cyan-50/40 to-teal-50/20 dark:from-cyan-950/15 dark:to-teal-950/10 border-l-2 border-l-cyan-400 dark:border-l-cyan-600' : ''}
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
            onClick={() => { skipAutoAdvanceRef.current = true; setPage(page - 1); setSelectedIds([]); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            &lt;
          </button>
          {getPageRange(page, lastPage).map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-slate-400">...</span>
            ) : (
              <button
                key={p}
                disabled={sendingBatch}
                onClick={() => { skipAutoAdvanceRef.current = true; setPage(p); setSelectedIds([]); }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                  p === page
                    ? 'bg-gradient-to-br from-fif-600 to-fif-500 text-white shadow-md shadow-fif-500/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            disabled={page >= lastPage || sendingBatch}
            onClick={() => { skipAutoAdvanceRef.current = true; setPage(page + 1); setSelectedIds([]); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
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
              <Button variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addDynamicRow}>
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

      <RollingDataModal open={showRollingModal} onClose={() => setShowRollingModal(false)} marketingUsers={marketingUsers} />
    </div>
  );
}
