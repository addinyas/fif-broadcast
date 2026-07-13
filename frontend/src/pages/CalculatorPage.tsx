import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Copy, Check, PenLine } from 'lucide-react';
import { customerService } from '../services/customerService';
import { calculateAngsuran } from '../finance/financeEngine';
import type { Customer } from '../types';

interface ManualCustomer {
  name: string;
  no_contract: string;
  obj_desc: string;
  tahun: string;
  plafon: string;
  angsuran: string;
  sisa_angsuran: string;
  nopol: string;
  cori: string;
  vcode: string;
}

export function CalculatorPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [manual, setManual] = useState<ManualCustomer | null>(null);
  const [sisaAngsuran, setSisaAngsuran] = useState(0);
  const [angsuranPerBulan, setAngsuranPerBulan] = useState(0);
  const [dinego, setDinego] = useState('');
  const [denda, setDenda] = useState('');
  const [pinjaman, setPinjaman] = useState(0);
  const [rate, setRate] = useState(44);
  const [tenors, setTenors] = useState([12, 18, 24, 30, 36]);

  const [nopol, setNopol] = useState('');

  const displayNopol = nopol || manual?.nopol || '';

  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const rawTahun = manual ? manual.tahun : (selected?.dynamic_data?.tahun as string) || '';
  const customerTahun = parseInt(rawTahun) || 0;
  const isOldMotor = customerTahun > 0 && customerTahun < 2016;

  const financeTenors = isOldMotor && !tenors.includes(6) ? [6, ...tenors] : tenors;
  const visibleTenors = isOldMotor ? financeTenors.filter(t => t <= 24) : tenors;

  const financeResult = useMemo(() => {
    if (pinjaman <= 0) return null;
    try {
      return calculateAngsuran({ pinjaman, rate, tenors: financeTenors });
    } catch {
      return null;
    }
  }, [pinjaman, rate, financeTenors]);

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const res = await customerService.searchCalculator(q);
      setResults(res);
    } catch { setResults([]); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(search), 300);
    return () => clearTimeout(timer);
  }, [search, searchCustomers]);

  const dyn = (key: string) => {
    if (manual) return (manual as unknown as Record<string, string>)[key] ?? '';
    return (selected?.dynamic_data?.[key] ?? '') as string;
  };

  const parseAngka = (val: string) => parseInt(val.replace(/\D/g, '')) || 0;

  const totalAngsuran = sisaAngsuran * angsuranPerBulan;
  const dendaVal = parseAngka(denda);
  const pelunasanBase = dinego ? parseInt(dinego.replace(/\D/g, '')) || 0 : totalAngsuran;
  const pelunasan = pelunasanBase + dendaVal;
  const terima = Math.max(0, pinjaman - pelunasan);

  const hasRequiredInput = sisaAngsuran > 0 && angsuranPerBulan > 0 && pinjaman > 0 && nopol.trim() !== '';

  const formatAngka = (val: number | string) => {
    const nums = typeof val === 'string' ? val.replace(/\D/g, '') : String(val);
    if (!nums) return '';
    return nums.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatAlphaNum = (val: string) => {
    return val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  const selectCustomer = (c: Customer) => {
    setSelected(c);
    setManual(null);
    setSearch('');
    setResults([]);
    const plafon = String(c.dynamic_data?.plafon ?? '0');
    setPinjaman(parseAngka(plafon));
    const sisa = String(c.dynamic_data?.sisa_angsuran ?? '0');
    setSisaAngsuran(parseInt(sisa) || 0);
    const angsuran = String(c.dynamic_data?.angsuran ?? c.dynamic_data?.angsuran_per_bulan ?? '0');
    setAngsuranPerBulan(parseAngka(angsuran));
    setDinego('');
    setDenda('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Kalkulator</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hitung angsuran dan simulasi pinjaman</p>
            </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau no kontrak..."
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
        />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-fif-50 dark:hover:bg-fif-900/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {(c.dynamic_data?.no_contract as string) || '-'}
                      {(c.dynamic_data?.obj_desc as string) ? ` · ${c.dynamic_data?.obj_desc}` : ''}
                      {(c.dynamic_data?.tahun as string) ? ` tahun ${c.dynamic_data?.tahun}` : ''}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}
        {search.trim().length >= 2 && results.length === 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Data tidak ditemukan</p>
            <button
              onClick={() => {
                const isNumeric = /^\d+$/.test(search);
                setManual({ name: isNumeric ? '' : search, no_contract: isNumeric ? search : '', obj_desc: '', tahun: '', plafon: '', angsuran: '', sisa_angsuran: '', nopol: '', cori: '', vcode: '' });
                setSearch('');
                setResults([]);
              }}
              className="flex items-center gap-2 rounded-lg bg-fif-50 dark:bg-fif-900/20 px-3 py-2 text-xs font-medium text-fif-600 dark:text-fif-400 hover:bg-fif-100 dark:hover:bg-fif-900/40 transition-colors"
            >
              <PenLine className="h-3.5 w-3.5" />
              Input Manual
            </button>
          </div>
        )}
      </div>

      {manual && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Nama <span className="text-red-500">*</span></label>
              <input value={manual.name}
                onChange={(e) => setManual({ ...manual, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">No Kontrak <span className="text-red-500">*</span></label>
              <input value={manual.no_contract}
                onChange={(e) => setManual({ ...manual, no_contract: e.target.value.replace(/\D/g, '') })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Unit <span className="text-red-500">*</span></label>
              <input value={formatAlphaNum(manual.obj_desc)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^A-Za-z0-9 ]/g, '');
                  const formatted = formatAlphaNum(raw);
                  setManual({ ...manual, obj_desc: formatted });
                }}
                placeholder="mis: VARIO 160 CBS"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Tahun <span className="text-red-500">*</span></label>
              <select value={manual.tahun}
                onChange={(e) => setManual({ ...manual, tahun: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              >
                <option value="">Pilih</option>
                {Array.from({ length: 2027 - 2010 + 1 }, (_, i) => 2010 + i).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Plafon (Rp) <span className="text-red-500">*</span></label>
              <input value={formatAngka(manual.plafon)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setManual({ ...manual, plafon: raw });
                  setPinjaman(parseInt(raw) || 0);
                }}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Angsuran Kontrak Aktif / Bulan (Rp) <span className="text-red-500">*</span></label>
              <input value={formatAngka(manual.angsuran)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setManual({ ...manual, angsuran: raw });
                  setAngsuranPerBulan(parseInt(raw) || 0);
                }}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Sisa Angsuran (kali) <span className="text-red-500">*</span></label>
              <select value={manual.sisa_angsuran}
                onChange={(e) => {
                  setManual({ ...manual, sisa_angsuran: e.target.value });
                  setSisaAngsuran(parseInt(e.target.value) || 0);
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              >
                <option value="">Pilih</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}×</option>
                ))}
              </select>
              </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Nopol <span className="text-red-500">*</span></label>
              <input value={formatAlphaNum(manual.nopol)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^A-Za-z0-9 ]/g, '');
                  const formatted = formatAlphaNum(raw);
                  setManual({ ...manual, nopol: formatted });
                  setNopol(formatted);
                }}
                placeholder="mis: AB 6116 JN"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">CORI</label>
              <select value={manual.cori}
                onChange={(e) => setManual({ ...manual, cori: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              >
                <option value="">Pilih</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="GOOD">GOOD</option>
                <option value="GOOD LOYAL">GOOD LOYAL</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Vcode</label>
              <input value={manual.vcode}
                onChange={(e) => setManual({ ...manual, vcode: e.target.value.toUpperCase() })}
                placeholder="Vcode"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Pelunasan Nego</label>
              <input value={formatAngka(dinego)}
                onChange={(e) => setDinego(e.target.value.replace(/\D/g, ''))}
                placeholder="Rp (opsional)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Denda</label>
              <input value={formatAngka(denda)}
                onChange={(e) => setDenda(e.target.value.replace(/\D/g, ''))}
                placeholder="Rp (opsional)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
          </div>
          <button onClick={() => { setManual(null); setPinjaman(0); setAngsuranPerBulan(0); setSisaAngsuran(0); setDinego(''); setDenda(''); }}
            className="mt-3 text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 transition-colors"
          >
            Hapus data manual
          </button>
        </div>
      )}

      {selected && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">No Kontrak</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{dyn('no_contract') || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Nama</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{selected.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Unit</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{dyn('obj_desc')} tahun {dyn('tahun')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Nopol</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{displayNopol || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">CORI</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{dyn('cori') || 'BELUM ADA'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Vcode</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{dyn('vcode') || 'BELUM ADA'}</p>
            </div>
          </div>
          <button onClick={() => { setSelected(null); setManual(null); setPinjaman(0); setDenda(''); }}
            className="mt-2 text-[10px] text-fif-600 hover:text-fif-700 dark:text-fif-400 transition-colors"
          >
            Ganti customer
          </button>
        </div>
      )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border-l-4 border-l-blue-400 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:bg-slate-800/90">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Input</h3>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Sisa Angsuran (kali) <span className="text-red-500">*</span></label>
                <select value={sisaAngsuran || ''}
                  onChange={(e) => setSisaAngsuran(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                >
                  <option value="">Pilih</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}×</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Angsuran Kontrak Aktif / Bulan <span className="text-red-500">*</span></label>
                <input
                  value={angsuranPerBulan ? formatAngka(angsuranPerBulan) : ''}
                  onChange={(e) => setAngsuranPerBulan(parseAngka(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Pelunasan Nego</label>
                <input value={formatAngka(dinego)}
                  onChange={(e) => setDinego(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp (opsional)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Denda</label>
                <input value={formatAngka(denda)}
                  onChange={(e) => setDenda(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp (opsional)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Pinjaman Maksimal <span className="text-red-500">*</span></label>
                <input
                  value={pinjaman ? formatAngka(pinjaman) : ''}
                  onChange={(e) => setPinjaman(parseAngka(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nopol <span className="text-red-500">*</span></label>
                <input value={formatAlphaNum(nopol)}
                  onChange={(e) => {
                  const raw = e.target.value.replace(/[^A-Za-z0-9 ]/g, '');
                    setNopol(formatAlphaNum(raw));
                  }}
                  placeholder="mis: AB 6116 JN"
                  className="w-full rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border-l-4 border-l-emerald-400 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:bg-slate-800/90">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hasil</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Angsuran Kurang</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{sisaAngsuran}×{formatAngka(angsuranPerBulan)} = Rp {formatAngka(totalAngsuran)}</span>
                </div>
                {dendaVal > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Denda</span>
                  <span className="font-semibold text-red-500">Rp {formatAngka(dendaVal)}</span>
                </div>
                )}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Pelunasan</span>
                  <span className="font-semibold text-fif-600">Rp {formatAngka(pelunasan)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">Terima</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">Rp {formatAngka(terima)}</span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Tenor Angsuran</h4>
                <div className="grid grid-cols-5 gap-2">
                  {visibleTenors.map((n, i) => {
                    const idx = financeTenors.indexOf(n);
                    const monthly = idx !== -1 ? (financeResult?.results[idx]?.angsuran ?? 0) : 0;
                    return (
                      <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-2 text-center text-sm">
                        <input type="number" min={1} max={36} value={n}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(36, parseInt(e.target.value) || 1));
                            setTenors((prev) => {
                              const next = [...prev];
                              const pos = prev.indexOf(n);
                              if (pos !== -1) next[pos] = val;
                              return next;
                            });
                          }}
                          className="mb-1 w-full text-center text-sm font-bold outline-none bg-transparent text-fif-600 dark:text-fif-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <p className="text-[10px] text-slate-500">Rp {formatAngka(monthly)}</p>
                      </div>
                    );
                  })}
                </div>
                {isOldMotor && (
                  <p className="mt-1.5 text-[10px] text-amber-500 font-medium">Tahun motor {'<'} 2016, tenor 6x tersedia & maksimal 24x</p>
                )}
                <p className="mt-1.5 text-[10px] text-slate-400 italic">Klik angka tenor untuk mengubah</p>
              </div>
              <div className="flex justify-center mt-2">
                <div className="w-full max-w-xs text-center">
                  <label className="mb-2 block text-sm font-bold text-fif-600 dark:text-fif-400 tracking-wide uppercase">Rate</label>
                  <div className="relative">
                    <select
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-fif-300 dark:border-fif-600 bg-fif-50 dark:bg-fif-900/20 px-4 py-3 text-lg font-bold text-center text-fif-700 dark:text-fif-300 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/30 appearance-none cursor-pointer"
                    >
                      {[42, 43, 44, 45, 46].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasRequiredInput ? (
          <div ref={outputRef} className="rounded-xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-800/90">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{dyn('no_contract')}</p>
                <p className="text-base font-medium text-slate-700 dark:text-slate-300 truncate">{manual?.name ?? selected?.name ?? '-'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Unit {dyn('obj_desc')} {displayNopol} thn {dyn('tahun')}</p>
                <div className="space-y-0.5 text-sm">
                  <p className="text-slate-600 dark:text-slate-400">
                    Angsuran Kurang <span className="font-semibold text-slate-800 dark:text-slate-200">{sisaAngsuran} × {formatAngka(angsuranPerBulan)} = Rp {formatAngka(totalAngsuran)}{dendaVal > 0 ? <span className="text-red-500"> + Rp {formatAngka(dendaVal)}</span> : ''}</span>
                  </p>
                  {dinego && (<p className="text-slate-600 dark:text-slate-400">Dinego Jadi Rp <span className="font-semibold text-slate-800 dark:text-slate-200">{formatAngka(parseAngka(dinego))}</span></p>)}
                  <p className="text-slate-600 dark:text-slate-400">Pinjaman Maksimal Rp <span className="font-semibold text-slate-800 dark:text-slate-200">{formatAngka(pinjaman)}</span></p>
                  <p className="text-slate-600 dark:text-slate-400">Pelunasan Rp <span className="font-semibold text-fif-600">{formatAngka(pelunasan)}</span></p>
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold text-base">Terima Rp {formatAngka(terima)}</p>
                </div>
                {(financeResult?.results ?? []).some((r) => visibleTenors.includes(r.tenor)) && (
                  <div className="mt-3 space-y-0.5 text-sm">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Tenor Angsuran</p>
                    {(financeResult?.results ?? []).filter((r) => visibleTenors.includes(r.tenor)).map((r, i) => (
                      <p key={i} className="text-slate-600 dark:text-slate-400">{r.tenor} × Rp {formatAngka(r.angsuran)}</p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const lines = [
                    `${dyn('no_contract') || '-'}`,
                    `${manual?.name ?? selected?.name ?? '-'}`,
                    `Unit ${dyn('obj_desc')}${displayNopol ? ` ${displayNopol}` : ''} thn ${dyn('tahun')}`,
                    `Angsuran Kurang ${sisaAngsuran} × ${formatAngka(angsuranPerBulan)} = Rp ${formatAngka(totalAngsuran)}${dendaVal > 0 ? ` + Rp ${formatAngka(dendaVal)}` : ''}`,
                    '',
                  ];
                  if (dinego) lines.push(`Dinego Jadi Rp ${formatAngka(parseAngka(dinego))}`);
                  lines.push(`Pinjaman Maksimal Rp ${formatAngka(pinjaman)}`);
                  lines.push(`Pelunasan Rp ${formatAngka(pelunasan)}`);
                  lines.push(`Terima Rp ${formatAngka(terima)}`);
                  lines.push('');
                  const tenors = (financeResult?.results ?? []).filter((r) => visibleTenors.includes(r.tenor));
                  if (tenors.length) {
                    lines.push('Tenor Angsuran');
                    tenors.forEach((r) => lines.push(`${r.tenor} × Rp ${formatAngka(r.angsuran)}`));
                  }
                  const text = lines.join('\r\n');
                  const onSuccess = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
                      const ta = document.createElement('textarea');
                      ta.value = text;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      onSuccess();
                    });
                  } else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    onSuccess();
                  }
                }}
                className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 p-2.5 text-slate-400 transition-all hover:bg-fif-50 hover:text-fif-600 dark:hover:bg-fif-900/20 dark:hover:text-fif-400 hover:border-fif-300"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Simulasi Tenor</p>
              <div className="flex flex-wrap gap-1.5">
                {visibleTenors.map((n, i) => {
                  const idx = financeTenors.indexOf(n);
                  const monthly = idx !== -1 ? (financeResult?.results[idx]?.angsuran ?? 0) : 0;
                  return (
                    <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{n}×</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Rp {formatAngka(monthly)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          ) : (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 p-8 text-center shadow-sm">
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">Isi semua field wajib di tabel Input untuk melihat rincian</p>
          </div>
          )}
    </div>
  );
}
