import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, UserCheck, Search, Download, Link, FileSpreadsheet, Type, AlertCircle, CheckCircle2, Eye, Trash2, Filter, ChevronDown } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Customer } from '../../types';
interface MarketingUser { id: number; name: string; email: string; assigned_customers_count?: number; }
type ImportTab = 'manual' | 'spreadsheet' | 'file';

export function CustomerManagementPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', phone_number: '' });
  const [manualRows, setManualRows] = useState<Record<string, string>[]>([{}]);
  const [importTab, setImportTab] = useState<ImportTab>('manual');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: unknown[]; skipped?: { row: number; no_contract: string; name: string; reason: string }[]; detected_columns?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showAssignByUnit, setShowAssignByUnit] = useState(false);
  const [showConfirmByUnit, setShowConfirmByUnit] = useState(false);
  const [marketingUsers, setMarketingUsers] = useState<MarketingUser[]>([]);
  const [selectedMarketingId, setSelectedMarketingId] = useState<number | null>(null);
  const [assignCounts, setAssignCounts] = useState({ nmc: 0, refi: 0 });
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllTotal, setDeleteAllTotal] = useState(0);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [selectedMceIds, setSelectedMceIds] = useState<number[]>([]);
  const [allMarketingUsers, setAllMarketingUsers] = useState<MarketingUser[]>([]);
  const [showAssigned, setShowAssigned] = useState(false);
  const [bussUnitFilter, setBussUnitFilter] = useState('');
  const [showBussUnitDropdown, setShowBussUnitDropdown] = useState(false);
  const bussUnitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bussUnitRef.current && !bussUnitRef.current.contains(e.target as Node)) {
        setShowBussUnitDropdown(false);
      }
    };
    if (showBussUnitDropdown) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showBussUnitDropdown]);

  const mceFilterKey = selectedMceIds.join(',');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), search, per_page: '500' };
      if (!showAssigned) {
        params.assignment_status = 'unassigned';
      }
      if (mceFilterKey) {
        params.marketing_ids = mceFilterKey;
      }
      if (bussUnitFilter) {
        params.buss_unit = bussUnitFilter;
      }
      const res = await customerService.getAll(params);
      setCustomers(res.data);
      setLastPage(res.last_page);
      setTotalCustomers(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, mceFilterKey, showAssigned, bussUnitFilter]);

  useEffect(() => {
    customerService.getMarketingUsers().then(setAllMarketingUsers);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      if (editId) {
        await customerService.update(editId, form);
        toast('success', 'Customer berhasil diperbarui');
      } else {
        await customerService.create(form);
        toast('success', 'Customer berhasil ditambahkan');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', phone_number: '' });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Gagal menyimpan customer';
      toast('error', msg);
    }
  };

  const handleEdit = (c: Customer) => {
    setForm({ name: c.name, phone_number: c.phone_number });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (c: Customer) => {
    try {
      await customerService.delete(c.id);
      toast('success', `Customer ${c.name} berhasil dihapus`);
      fetchData();
    } catch {
      toast('error', 'Gagal menghapus customer');
    }
  };

  const resetImport = () => {
    setManualRows([{}]);
    setSpreadsheetUrl('');
    setImportFile(null);
    setImportResult(null);
    setImportTab('manual');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      let result: { imported: number; failed: unknown[]; skipped?: { row: number; no_contract: string; name: string; reason: string }[]; detected_columns?: string[] };
      if (importTab === 'manual') {
        const customers = manualRows.map((row) => ({
          name: row.name || row.nama || '',
          phone_number: row.phone_number || row.no_whatsapp || row.phone || '',
          dynamic_data: { ...row },
        }));
        result = await customerService.bulkImport(customers);
      } else if (importTab === 'spreadsheet') {
        result = await customerService.importSpreadsheet(spreadsheetUrl);
      } else {
        if (!importFile) throw new Error('Pilih file terlebih dahulu');
        result = await customerService.importFile(importFile);
      }
      setImportResult(result);
      const hasSkipped = result.skipped && result.skipped.length > 0;
      const allImported = result.imported > 0 && result.failed.length === 0 && !hasSkipped;
      if (result.imported > 0) {
        toast('success', `${result.imported} customer berhasil diimport`);
      }
      if (result.failed.length > 0) {
        toast('error', `${result.failed.length} baris gagal`);
      }
      if (hasSkipped) {
        toast('warning', `${result.skipped!.length} data duplikat dilewati`);
      }
      fetchData();
      if (allImported) {
        setTimeout(() => { setShowImport(false); resetImport(); }, 800);
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      let msg = 'Gagal mengimport customer';
      if (data?.message && typeof data.message === 'string') {
        msg = data.message;
      } else if (data?.errors && typeof data.errors === 'object') {
        const vals = Object.values(data.errors).flat();
        msg = vals.length > 0 ? String(vals[0]) : msg;
      } else if ((err as Error)?.message) {
        msg = (err as Error).message;
      }
      toast('error', msg);
    } finally {
      setImporting(false);
    }
  };

  const dyn = (c: Customer, key: string) => (c.dynamic_data?.[key] ?? '') as string;

  const formatRupiah = (val: string) => {
    const nums = val.replace(/\D/g, '');
    if (!nums) return '';
    return nums.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const sharedColumns = [
    { key: 'no_contract', header: 'No Contract', render: (c: Customer) => dyn(c, 'no_contract') },
    { key: 'nama', header: 'Nama', render: (c: Customer) => dyn(c, 'nama') || c.name },
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
                        setSelectAllPages(false);
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
      render: (c: Customer) => dyn(c, 'buss_unit'),
    },
    { key: 'obj_desc', header: 'Obj Desc', render: (c: Customer) => dyn(c, 'obj_desc') },
    { key: 'vcode', header: 'V Code', render: (c: Customer) => dyn(c, 'vcode') },
    { key: 'tahun', header: 'Tahun', render: (c: Customer) => dyn(c, 'tahun') },
    { key: 'otr', header: 'OTR', render: (c: Customer) => formatRupiah(dyn(c, 'otr')) || '-' },
    {
      key: 'plafon', header: 'Plafon', render: (c: Customer) => {
        const coriVal = (dyn(c, 'cori') || '').toUpperCase();
        const original = dyn(c, 'plafon');
        const pembulatan75 = dyn(c, 'pembulatan_75');
        const pembulatan90 = dyn(c, 'pembulatan_90');
        const calculated = coriVal === 'MEDIUM' ? pembulatan75 : coriVal === 'GOOD' || coriVal === 'GOOD LOYAL' ? pembulatan90 : null;

        return (
          <span className={calculated && calculated !== original ? 'text-fif-600 font-semibold' : ''}>
            {calculated ? formatRupiah(calculated) : formatRupiah(original) || '-'}
          </span>
        );
      }
    },
    {
      key: 'cori', header: 'CORI', render: (c: Customer) => {
        const coriVal = (dyn(c, 'cori') || '').toUpperCase();
        const pembulatan75 = dyn(c, 'pembulatan_75');
        const pembulatan90 = dyn(c, 'pembulatan_90');
        const activePembulatan = coriVal === 'MEDIUM' ? pembulatan75 : coriVal === 'GOOD' || coriVal === 'GOOD LOYAL' ? pembulatan90 : null;

        return (
          <div className="flex items-center gap-2">
            <select
              value={coriVal}
              onChange={async (e) => {
                const newVal = e.target.value;
                try {
                  const updated = await customerService.updateCori(c.id, newVal);
                  setCustomers((prev) => prev.map((p) => p.id === c.id ? { ...p, dynamic_data: updated.dynamic_data } : p));
                } catch {
                  toast('error', 'Gagal mengupdate CORI');
                }
              }}
              className={`rounded-lg border px-2 py-1 text-xs font-semibold uppercase tracking-wider outline-none transition-all focus:ring-2 focus:ring-fif-500/30 ${
                coriVal === 'MEDIUM' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                coriVal === 'GOOD' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                coriVal === 'GOOD LOYAL' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                'border-slate-300 bg-white text-slate-600'
              }`}
            >
              <option value="">--</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="GOOD">GOOD</option>
              <option value="GOOD LOYAL">GOOD LOYAL</option>
            </select>
            {activePembulatan && (
              <span className="text-xs font-mono text-slate-400">
                {activePembulatan}
              </span>
            )}
          </div>
        );
      }
    },
    { key: 'phone', header: 'Phone', render: (c: Customer) => dyn(c, 'phone') || c.phone_number },
    {
      key: 'detail', header: '', render: (c: Customer) => (
        <button
          onClick={() => setDetailCustomer(c)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-fif-50 hover:text-fif-600"
          title="Lihat detail"
        >
          <Eye className="h-4 w-4" />
        </button>
      )
    },
  ];

  const adminColumns = [
    ...sharedColumns.slice(0, -1),
    {
      key: 'assignment_status', header: 'Status', render: (c: Customer) => (
        <Badge variant={c.assignment_status === 'assigned' ? 'success' : 'default'}>
          {c.assignment_status}
        </Badge>
      )
    },
    { key: 'marketing', header: 'Marketing', render: (c: Customer) => c.marketing?.name || '-' },
    sharedColumns[sharedColumns.length - 1],
  ];

  const columns = isAdmin ? adminColumns : sharedColumns;

  const tabs: { key: ImportTab; label: string; icon: typeof Type }[] = [
    { key: 'manual', label: 'Manual', icon: Type },
    { key: 'spreadsheet', label: 'Link Spreadsheet', icon: Link },
    { key: 'file', label: 'File CSV', icon: FileSpreadsheet },
  ];

  const dynamicFields = [
    { key: 'no_contract', label: 'No Contract' },
    { key: 'name', label: 'Nama' },
    { key: 'no_whatsapp', label: 'No Whatsapp' },
    { key: 'buss_unit', label: 'Buss Unit' },
    { key: 'obj_desc', label: 'Obj Desc' },
    { key: 'vcode', label: 'V Code' },
    { key: 'tahun', label: 'Tahun' },
    { key: 'otr', label: 'OTR' },
    { key: 'plafon', label: 'Plafon' },
    { key: 'cori', label: 'CORI' },
    { key: '75', label: '75%' },
    { key: '90', label: '90%' },
    { key: 'kota', label: 'Kota' },
    { key: 'kecamatan', label: 'Kecamatan' },
    { key: 'kelurahan', label: 'Kelurahan' },
  ];

  const isRupiahField = (key: string) => key === 'otr' || key === 'plafon';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Customer Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola data customer dan assignment</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button variant="secondary" icon={<Upload className="h-4 w-4" />}
                onClick={() => { setShowImport(true); resetImport(); }}>
                Import
              </Button>
            </>
          )}
          {isAdmin && (
            <>
              <Button
                variant="secondary"
                icon={<UserCheck className="h-4 w-4" />}
                disabled={selectedIds.length === 0}
                onClick={async () => {
                  const users = await customerService.getMarketingUsers();
                  setMarketingUsers(users);
                  setSelectedMarketingId(null);
                  setShowAssign(true);
                }}
              >
                Assign ({selectedIds.length})
              </Button>
              <Button
                variant="secondary"
                icon={<Filter className="h-4 w-4" />}
                disabled={selectedIds.length === 0}
                onClick={async () => {
                  const users = await customerService.getMarketingUsers();
                  setMarketingUsers(users);
                  setSelectedMarketingId(null);
                  setAssignCounts({ nmc: 0, refi: 0 });
                  setShowAssignByUnit(true);
                }}
              >
                By Unit
              </Button>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  className="relative flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="-mr-0.5">{selectedIds.length}</span>
                </button>
              )}
            </>
          )}
          {isAdmin && (
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={async () => {
                const res = await customerService.getAll({ page: '1', per_page: '1' });
                setDeleteAllTotal(res.total);
                setShowDeleteAllConfirm(true);
              }}
            >
              Hapus Semua
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectAllPages(false); }}
            placeholder="Cari customer..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
          />
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 px-3 py-2 shadow-sm backdrop-blur-xl">
            {allMarketingUsers.length > 0 && (
              <>
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="mr-1 text-xs font-medium text-slate-500 dark:text-slate-400">MCE:</span>
              </>
            )}
            <button
              onClick={() => { setShowAssigned((p) => !p); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                !showAssigned
                  ? 'bg-fif-100 text-fif-700 ring-1 ring-fif-300 dark:bg-fif-900/30 dark:text-fif-300 dark:ring-fif-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
              }`}
            >
              {!showAssigned ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-400 dark:border-slate-500" />
              )}
              {showAssigned ? 'Tampilkan semua' : 'Hanya unassigned'}
            </button>
            {allMarketingUsers.length > 0 && allMarketingUsers.map((u) => {
              const checked = selectedMceIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    checked
                      ? 'bg-fif-100 text-fif-700 ring-1 ring-fif-300 dark:bg-fif-900/30 dark:text-fif-300 dark:ring-fif-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedMceIds((prev) =>
                        prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      );
                      setPage(1);
                      setSelectAllPages(false);
                    }}
                    className="sr-only"
                  />
                  {checked ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-400 dark:border-slate-500" />
                  )}
                  {u.name}
                </label>
              );
            })}
            {allMarketingUsers.length > 0 && selectedMceIds.length > 0 && (
              <button
                onClick={() => { setSelectedMceIds([]); setPage(1); }}
                className="ml-1 rounded-md px-1.5 py-0.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                clear
              </button>
            )}

          </div>
        )}
      </div>

      {(function renderPagination() {
        const maxVisible = 5;
        const pages: (number | 'ellipsis')[] = [];
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(lastPage, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
          start = Math.max(1, end - maxVisible + 1);
        }
        if (start > 1) {
          pages.push(1);
          if (start > 2) pages.push('ellipsis');
        }
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < lastPage) {
          if (end < lastPage - 1) pages.push('ellipsis');
          pages.push(lastPage);
        }
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Halaman {page} dari {lastPage}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => { setPage(page - 1); setSelectAllPages(false); }}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                Prev
              </button>
              {pages.map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => { setPage(p); setSelectAllPages(false); }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      p === page
                        ? 'bg-gradient-to-br from-fif-600 to-fif-500 text-white shadow-md shadow-fif-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page >= lastPage}
                onClick={() => { setPage(page + 1); setSelectAllPages(false); }}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        );
      })()}

      <DataTable
        columns={columns} data={customers} loading={loading}
        onEdit={isAdmin ? handleEdit : undefined} onDelete={isAdmin ? handleDelete : undefined}
        showCheckbox={isAdmin} selectedIds={selectedIds}
        allPageSelected={isAdmin && customers.length > 0 && customers.every((c) => selectedIds.includes(c.id))}
        onSelect={(id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
        onSelectAll={() => {
          const allCurrentPageSelected = customers.every((c) => selectedIds.includes(c.id));
          if (allCurrentPageSelected) {
            setSelectedIds((prev) => prev.filter((id) => !customers.some((c) => c.id === id)));
            setSelectAllPages(false);
          } else {
            setSelectedIds((prev) => {
              const newIds = [...prev];
              for (const c of customers) {
                if (!newIds.includes(c.id)) newIds.push(c.id);
              }
              return newIds;
            });
            if (customers.length > 0 && totalCustomers > customers.length) {
              setSelectAllPages(true);
            }
          }
        }}
      />

      {selectAllPages && selectedIds.length === customers.length && totalCustomers > customers.length && (
        <div className="-mt-2 text-center">
          <button
            onClick={async () => {
              const res = await customerService.getAllIds();
              const ids = (res.ids as number[]).slice(0, 500);
              setSelectedIds(ids);
              setSelectAllPages(false);
            }}
            className="text-sm font-medium text-fif-600 dark:text-fif-400 hover:text-fif-700 dark:hover:text-fif-300 hover:underline"
          >
            Pilih semua {Math.min(totalCustomers, 500)} customer
          </button>
          <span className="ml-1 text-sm text-slate-400 dark:text-slate-500">({selectedIds.length} dipilih)</span>
        </div>
      )}

      {(function renderPagination() {
        const maxVisible = 5;
        const pages: (number | 'ellipsis')[] = [];
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(lastPage, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
          start = Math.max(1, end - maxVisible + 1);
        }
        if (start > 1) {
          pages.push(1);
          if (start > 2) pages.push('ellipsis');
        }
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < lastPage) {
          if (end < lastPage - 1) pages.push('ellipsis');
          pages.push(lastPage);
        }
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Halaman {page} dari {lastPage}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => { setPage(page - 1); setSelectAllPages(false); }}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                Prev
              </button>
              {pages.map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => { setPage(p); setSelectAllPages(false); }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      p === page
                        ? 'bg-gradient-to-br from-fif-600 to-fif-500 text-white shadow-md shadow-fif-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page >= lastPage}
                onClick={() => { setPage(page + 1); setSelectAllPages(false); }}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        );
      })()}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Customer' : 'Tambah Customer'}>
        <div className="space-y-4">
          <Input label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama customer" />
          <Input label="No. HP" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="08123456789" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showImport} onClose={() => { setShowImport(false); resetImport(); }} title="Import Customers" size="lg">
        <div className="space-y-5">
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setImportTab(tab.key); setImportResult(null); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    importTab === tab.key
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm dark:shadow-slate-900/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {importTab === 'manual' && (
            <div className="space-y-4">
              {manualRows.map((row, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Customer {i + 1}</span>
                    <button
                      onClick={() => setManualRows((prev) => prev.filter((_, j) => j !== i))}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {dynamicFields.map((f) => {
                      const rupiah = isRupiahField(f.key);
                      return (
                        <div key={f.key}>
                          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{f.label}</label>
                          <input
                            value={rupiah ? formatRupiah(row[f.key] || '') : (row[f.key] || '')}
                            onChange={(e) => {
                              const next = [...manualRows];
                              next[i] = { ...next[i], [f.key]: rupiah ? e.target.value.replace(/\./g, '') : e.target.value };
                              setManualRows(next);
                            }}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setManualRows((prev) => [...prev, {}])}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:border-fif-400 hover:text-fif-600 dark:hover:border-fif-500 dark:hover:text-fif-400"
              >
                + Tambah Customer
              </button>
            </div>
          )}

          {importTab === 'spreadsheet' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Masukkan URL Google Spreadsheet (pastikan akses publik atau sudah dishare ke service email)</p>
              <Input
                label="URL Spreadsheet"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
            </div>
          )}

          {importTab === 'file' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Upload file <strong>.csv</strong> atau <strong>.xlsx</strong> (maks 10MB)</p>
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-6 py-8 transition-all hover:border-fif-400 hover:bg-fif-50/50 dark:hover:bg-fif-900/20">
                <FileSpreadsheet className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                <div className="text-center">
                  {importFile ? (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{importFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Klik untuk pilih file</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">CSV, XLSX</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}

          {importResult && (
            <div className={`rounded-xl border p-4 ${
              importResult.failed.length === 0 && importResult.imported > 0 && (!importResult.skipped || importResult.skipped.length === 0)
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <div className="flex items-start gap-3">
                {importResult.failed.length === 0 && importResult.imported > 0 && (!importResult.skipped || importResult.skipped.length === 0) ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {importResult.imported > 0
                      ? `${importResult.imported} customer berhasil diimport`
                      : 'Tidak ada data yang diimport'}
                  </p>
                  {importResult.skipped && importResult.skipped.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {importResult.skipped.length} data duplikat dilewati (No Contract sudah terdaftar):
                      </p>
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300">
                              <th className="px-2 py-1 font-semibold">#</th>
                              <th className="px-2 py-1 font-semibold">No Contract</th>
                              <th className="px-2 py-1 font-semibold">Nama</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 dark:divide-amber-800">
                            {importResult.skipped.map((s, i) => (
                              <tr key={i} className="text-amber-900 dark:text-amber-200">
                                <td className="px-2 py-1 text-amber-600">{s.row}</td>
                                <td className="px-2 py-1 font-mono">{s.no_contract}</td>
                                <td className="px-2 py-1">{s.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {importResult.failed.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{importResult.failed.length} baris gagal</p>
                  )}
                  {'detected_columns' in importResult && importResult.detected_columns && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Kolom yang terdeteksi:</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{importResult.detected_columns.join(', ')}</p>
                    </div>
                  )}
                  {'detected_columns' in importResult && importResult.detected_columns && importResult.imported === 0 && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                      Pastikan spreadsheet memiliki kolom <strong>Nama</strong> atau <strong>Name</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowImport(false); resetImport(); }}>
              Tutup
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={importing || (importTab === 'manual' && !manualRows.some((r) => Object.values(r).some(Boolean))) || (importTab === 'spreadsheet' && !spreadsheetUrl.trim()) || (importTab === 'file' && !importFile)}
                icon={importing ? undefined : <Download className="h-4 w-4" />}
              >
                {importing ? 'Mengimport...' : 'Import'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={showDeleteAllConfirm} onClose={() => setShowDeleteAllConfirm(false)} title="Hapus Semua Customer">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {deleteAllTotal} data akan dihapus permanen
              </p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Termasuk riwayat broadcast. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowDeleteAllConfirm(false)}>Batal</Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  const res = await customerService.deleteAll();
                  toast('success', res.message);
                  setShowDeleteAllConfirm(false);
                  setSelectedIds([]);
                  fetchData();
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Gagal menghapus customer';
                  toast('error', msg);
                }
              }}
            >
              Ya, Hapus Semua
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showBatchDeleteConfirm} onClose={() => setShowBatchDeleteConfirm(false)} title="Hapus Customer">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {selectedIds.length} customer akan dihapus
              </p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowBatchDeleteConfirm(false)}>Batal</Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  const res = await customerService.batchDelete(selectedIds);
                  toast('success', res.message);
                  setSelectedIds([]);
                  setShowBatchDeleteConfirm(false);
                  fetchData();
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Gagal menghapus customer';
                  toast('error', msg);
                }
              }}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign ke Marketing">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Pilih marketing untuk {selectedIds.length} customer</p>
          <select
            value={selectedMarketingId ?? ''}
            onChange={(e) => setSelectedMarketingId(parseInt(e.target.value) || null)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
          >
            <option value="">-- Pilih Marketing --</option>
            {marketingUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.assigned_customers_count ?? 0} data</option>
            ))}
          </select>
          {marketingUsers.length === 0 && (
            <p className="text-sm text-red-500 dark:text-red-400">Tidak ada user marketing. Daftarkan marketing terlebih dahulu.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAssign(false)}>Batal</Button>
            <Button
              onClick={async () => {
                if (!selectedMarketingId) return;
                try {
                  await customerService.assign(selectedIds, selectedMarketingId);
                  toast('success', `${selectedIds.length} customer berhasil diassign`);
                  setSelectedIds([]);
                  setShowAssign(false);
                  fetchData();
                } catch {
                  toast('error', 'Gagal mengassign customer');
                }
              }}
              disabled={!selectedMarketingId}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showAssignByUnit} onClose={() => setShowAssignByUnit(false)} title="Assign by Unit">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Tentukan jumlah NMC dan REFI yang akan diassign ke marketing</p>
          <select
            value={selectedMarketingId ?? ''}
            onChange={(e) => setSelectedMarketingId(parseInt(e.target.value) || null)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
          >
            <option value="">-- Pilih Marketing --</option>
            {marketingUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.assigned_customers_count ?? 0} data</option>
            ))}
          </select>
          {marketingUsers.length === 0 && (
            <p className="text-sm text-red-500 dark:text-red-400">Tidak ada user marketing. Daftarkan marketing terlebih dahulu.</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Jumlah NMC</label>
              <input
                type="number" min={0}
                value={assignCounts.nmc || ''}
                onChange={(e) => setAssignCounts((p) => ({ ...p, nmc: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Jumlah REFI</label>
              <input
                type="number" min={0}
                value={assignCounts.refi || ''}
                onChange={(e) => setAssignCounts((p) => ({ ...p, refi: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAssignByUnit(false)}>Batal</Button>
            <Button
              onClick={() => setShowConfirmByUnit(true)}
              disabled={!selectedMarketingId || (assignCounts.nmc + assignCounts.refi) === 0}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showConfirmByUnit} onClose={() => setShowConfirmByUnit(false)} title="Konfirmasi Assign by Unit">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Assign ke {marketingUsers.find((u) => u.id === selectedMarketingId)?.name || 'Marketing'}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                NMC: <strong>{assignCounts.nmc}</strong>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                REFI: <strong>{assignCounts.refi}</strong>
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Total: <strong>{assignCounts.nmc + assignCounts.refi}</strong> customer
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowConfirmByUnit(false)}>Batal</Button>
            <Button
              onClick={async () => {
                if (!selectedMarketingId) return;
                const total = assignCounts.nmc + assignCounts.refi;
                if (total === 0) return;
                try {
                  const res = await customerService.assignByUnit(selectedMarketingId, assignCounts.nmc, assignCounts.refi);
                  toast('success', `${res.total} customer berhasil diassign`);
                  setSelectedIds([]);
                  setShowConfirmByUnit(false);
                  setShowAssignByUnit(false);
                  fetchData();
                } catch {
                  toast('error', 'Gagal mengassign customer');
                }
              }}
            >
              Ya, Assign
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailCustomer} onClose={() => setDetailCustomer(null)} title="Detail Customer" size="md">
        {detailCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Nama</p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{detailCustomer.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">No. HP</p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{detailCustomer.phone_number}</p>
              </div>
              {isAdmin && (
                <>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</p>
                    <p className="mt-1">
                      <Badge variant={detailCustomer.assignment_status === 'assigned' ? 'success' : 'default'}>
                        {detailCustomer.assignment_status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Marketing</p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{detailCustomer.marketing?.name || '-'}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Diupload oleh</p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{detailCustomer.uploader?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal Upload</p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {detailCustomer.created_at ? new Date(detailCustomer.created_at).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
            </div>

            {detailCustomer.dynamic_data && Object.keys(detailCustomer.dynamic_data).length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Data Tambahan</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-2.5">Field</th>
                        <th className="px-4 py-2.5">Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {dynamicFields.map((field) => {
                        let val = detailCustomer.dynamic_data?.[field.key];
                        if (!val && field.key === 'name') {
                          val = detailCustomer.dynamic_data?.['nama'];
                        }
                        if (!val) return null;
                        return (
                          <tr key={field.key} className="even:bg-slate-50 dark:even:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-700/80">
                            <td className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">{field.label}</td>
                            <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{isRupiahField(field.key) ? formatRupiah(val as string) : (val as string)}</td>
                          </tr>
                        );
                      })}
                      {Object.entries(detailCustomer.dynamic_data).map(([key, val]) => {
                        if (dynamicFields.some(f => f.key === key)) return null;
                        if (key === 'pembulatan_75' || key === 'pembulatan_90') return null;
                        return (
                          <tr key={key} className="even:bg-slate-50 dark:even:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-700/80">
                            <td className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">{key}</td>
                            <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{val as string}</td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!detailCustomer.dynamic_data || Object.keys(detailCustomer.dynamic_data).length === 0) && (
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">Tidak ada data tambahan</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
