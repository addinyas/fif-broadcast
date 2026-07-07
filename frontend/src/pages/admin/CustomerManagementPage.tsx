import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Upload, UserCheck, Search, Download, Link, FileSpreadsheet, Type, AlertCircle, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Customer } from '../../types';
interface MarketingUser { id: number; name: string; email: string; }
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
  const [importText, setImportText] = useState('');
  const [importTab, setImportTab] = useState<ImportTab>('manual');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: unknown[]; detected_columns?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [marketingUsers, setMarketingUsers] = useState<MarketingUser[]>([]);
  const [selectedMarketingId, setSelectedMarketingId] = useState<number | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllTotal, setDeleteAllTotal] = useState(0);
  const [selectAllPages, setSelectAllPages] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.getAll({ page: page.toString(), search });
      setCustomers(res.data);
      setLastPage(res.last_page);
      setTotalCustomers(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

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
    setImportText('');
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
      let result: { imported: number; failed: unknown[]; detected_columns?: string[] };
      if (importTab === 'manual') {
        const lines = importText.trim().split('\n').filter(Boolean);
        const customers = lines.map((line) => {
          const [name, phone_number] = line.split(',');
          return { name: name.trim(), phone_number: phone_number.trim() };
        });
        result = await customerService.bulkImport(customers);
      } else if (importTab === 'spreadsheet') {
        result = await customerService.importSpreadsheet(spreadsheetUrl);
      } else {
        if (!importFile) throw new Error('Pilih file terlebih dahulu');
        result = await customerService.importFile(importFile);
      }
      setImportResult(result);
      const allImported = result.imported > 0 && result.failed.length === 0;
      if (result.imported > 0) {
        toast('success', `${result.imported} customer berhasil diimport`);
      }
      if (result.failed.length > 0) {
        toast('error', `${result.failed.length} baris gagal`);
      }
      fetchData();
      if (allImported) {
        setTimeout(() => { setShowImport(false); resetImport(); }, 800);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Gagal mengimport customer';
      toast('error', msg);
    } finally {
      setImporting(false);
    }
  };

  const dyn = (c: Customer, key: string) => (c.dynamic_data?.[key] ?? '') as string;

  const sharedColumns = [
    { key: 'no_contract', header: 'No Contract', render: (c: Customer) => dyn(c, 'no_contract') },
    { key: 'nama', header: 'Nama', render: (c: Customer) => dyn(c, 'nama') || c.name },
    { key: 'buss_unit', header: 'Buss Unit', render: (c: Customer) => dyn(c, 'buss_unit') },
    { key: 'obj_desc', header: 'Obj Desc', render: (c: Customer) => dyn(c, 'obj_desc') },
    { key: 'vcode', header: 'V Code', render: (c: Customer) => dyn(c, 'vcode') },
    { key: 'tahun', header: 'Tahun', render: (c: Customer) => dyn(c, 'tahun') },
    { key: 'otr', header: 'OTR', render: (c: Customer) => dyn(c, 'otr') },
    {
      key: 'plafon', header: 'Plafon', render: (c: Customer) => {
        const coriVal = (dyn(c, 'cori') || '').toUpperCase();
        const original = dyn(c, 'plafon');
        const pembulatan75 = dyn(c, 'pembulatan_75');
        const pembulatan90 = dyn(c, 'pembulatan_90');
        const calculated = coriVal === 'MEDIUM' ? pembulatan75 : coriVal === 'GOOD' || coriVal === 'GOOD LOYAL' ? pembulatan90 : null;

        return (
          <span className={calculated && calculated !== original ? 'text-fif-600 font-semibold' : ''}>
            {calculated || original || '-'}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Customer Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola data customer dan assignment</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', phone_number: '' }); }}
              >
                Tambah
              </Button>
              <Button variant="secondary" icon={<Upload className="h-4 w-4" />}
                onClick={() => { setShowImport(true); resetImport(); }}>
                Import
              </Button>
            </>
          )}
          {selectedIds.length > 0 && (
            <>
              {isAdmin && (
                <Button
                  variant="secondary"
                  icon={<UserCheck className="h-4 w-4" />}
                  onClick={async () => {
                    const users = await customerService.getMarketingUsers();
                    setMarketingUsers(users);
                    setSelectedMarketingId(null);
                    setShowAssign(true);
                  }}
                >
                  Assign ({selectedIds.length})
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="danger"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={async () => {
                    try {
                      const res = await customerService.batchDelete(selectedIds);
                      toast('success', res.message);
                      setSelectedIds([]);
                      fetchData();
                    } catch (err: unknown) {
                      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Gagal menghapus customer';
                      toast('error', msg);
                    }
                  }}
                >
                  Hapus ({selectedIds.length})
                </Button>
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

      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectAllPages(false); }}
          placeholder="Cari customer..."
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
        />
      </div>

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
              setSelectedIds(res.ids);
              setSelectAllPages(false);
            }}
            className="text-sm font-medium text-fif-600 dark:text-fif-400 hover:text-fif-700 dark:hover:text-fif-300 hover:underline"
          >
            Pilih semua {totalCustomers} customer
          </button>
          <span className="ml-1 text-sm text-slate-400 dark:text-slate-500">({selectedIds.length} dipilih)</span>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>Halaman {page} dari {lastPage}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelectAllPages(false); }}>
            Sebelumnya
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => { setPage(page + 1); setSelectAllPages(false); }}>
            Selanjutnya
          </Button>
        </div>
      </div>

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
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Format: <code className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono">nama,phone_number</code> (satu per baris)</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                placeholder={`Budi Santoso,08123456789\nSiti Aminah,08234567890`}
              />
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
              <p className="text-sm text-slate-500">Upload file <strong>.csv</strong> (maks 10MB)</p>
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-6 py-8 transition-all hover:border-fif-400 hover:bg-fif-50/50 dark:hover:bg-fif-900/20">
                <FileSpreadsheet className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                <div className="text-center">
                  {importFile ? (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{importFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Klik untuk pilih file</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">CSV</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}

          {importResult && (
            <div className={`rounded-xl border p-4 ${
              importResult.failed.length === 0 && importResult.imported > 0
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <div className="flex items-start gap-3">
                {importResult.failed.length === 0 && importResult.imported > 0 ? (
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
            <Button
              onClick={handleImport}
              disabled={importing || (importTab === 'manual' && !importText.trim()) || (importTab === 'spreadsheet' && !spreadsheetUrl.trim()) || (importTab === 'file' && !importFile)}
              icon={importing ? undefined : <Download className="h-4 w-4" />}
            >
              {importing ? 'Mengimport...' : 'Import'}
            </Button>
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
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
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
                            <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{val as string}</td>
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
