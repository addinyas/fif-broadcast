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
}

export function CalculatorPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [manual, setManual] = useState<ManualCustomer | null>(null);
  const [sisaAngsuran, setSisaAngsuran] = useState(0);
  const [angsuranPerBulan, setAngsuranPerBulan] = useState(0);
  const [dinego, setDinego] = useState('');
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

  const totalAngsuran = sisaAngsuran * angsuranPerBulan;
  const pelunasan = dinego ? parseInt(dinego.replace(/\D/g, '')) || 0 : totalAngsuran;
  const terima = Math.max(0, pinjaman - pelunasan);

  const formatRupiah = (val: number | string) => {
    const nums = typeof val === 'string' ? val.replace(/\D/g, '') : String(val);
    if (!nums) return '';
    return nums.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseRupiah = (val: string) => parseInt(val.replace(/\D/g, '')) || 0;

  const selectCustomer = (c: Customer) => {
    setSelected(c);
    setManual(null);
    setSearch('');
    setResults([]);
    const plafon = String(c.dynamic_data?.plafon ?? '0');
    setPinjaman(parseRupiah(plafon));
    const sisa = String(c.dynamic_data?.sisa_angsuran ?? '0');
    setSisaAngsuran(parseInt(sisa) || 0);
    const angsuran = String(c.dynamic_data?.angsuran ?? c.dynamic_data?.angsuran_per_bulan ?? '0');
    setAngsuranPerBulan(parseRupiah(angsuran));
    setDinego('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Kalkulator</h1>
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
                setManual({ name: isNumeric ? '' : search, no_contract: isNumeric ? search : '', obj_desc: '', tahun: '', plafon: '', angsuran: '', sisa_angsuran: '', nopol: '' });
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
              <input value={manual.obj_desc}
                onChange={(e) => setManual({ ...manual, obj_desc: e.target.value })}
                placeholder="mis: Vario 125"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Tahun <span className="text-red-500">*</span></label>
              <input value={manual.tahun}
                onChange={(e) => setManual({ ...manual, tahun: e.target.value })}
                placeholder="2020"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Plafon (Rp) <span className="text-red-500">*</span></label>
              <input value={formatRupiah(manual.plafon)}
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
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Angsuran / Bulan (Rp) <span className="text-red-500">*</span></label>
              <input value={formatRupiah(manual.angsuran)}
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
              <input value={manual.nopol}
                onChange={(e) => {
                  setManual({ ...manual, nopol: e.target.value });
                  setNopol(e.target.value);
                }}
                placeholder="mis: B 1234 ABC"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">Pelunasan Nego</label>
              <input value={formatRupiah(dinego)}
                onChange={(e) => setDinego(e.target.value.replace(/\D/g, ''))}
                placeholder="Rp (opsional)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
              />
            </div>
          </div>
          <button onClick={() => { setManual(null); setPinjaman(0); setAngsuranPerBulan(0); setSisaAngsuran(0); setDinego(''); }}
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
          </div>
          <button onClick={() => { setSelected(null); setManual(null); setPinjaman(0); }}
            className="mt-2 text-[10px] text-fif-600 hover:text-fif-700 dark:text-fif-400 transition-colors"
          >
            Ganti customer
          </button>
        </div>
      )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
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
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Angsuran / Bulan <span className="text-red-500">*</span></label>
                <input
                  value={angsuranPerBulan ? formatRupiah(angsuranPerBulan) : ''}
                  onChange={(e) => setAngsuranPerBulan(parseRupiah(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Pelunasan Nego</label>
                <input value={formatRupiah(dinego)}
                  onChange={(e) => setDinego(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp (opsional)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Pinjaman Maksimal Cair <span className="text-red-500">*</span></label>
                <input
                  value={pinjaman ? formatRupiah(pinjaman) : ''}
                  onChange={(e) => setPinjaman(parseRupiah(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nopol <span className="text-red-500">*</span></label>
                <input value={nopol}
                  onChange={(e) => setNopol(e.target.value)}
                  placeholder="mis: B 1234 ABC"
                  className="w-full rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hasil</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Angsuran Kurang</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{sisaAngsuran}×{formatRupiah(angsuranPerBulan)} = Rp {formatRupiah(totalAngsuran)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Pelunasan</span>
                  <span className="font-semibold text-fif-600">Rp {formatRupiah(pelunasan)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">Terima</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">Rp {formatRupiah(terima)}</span>
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
                        <p className="text-[10px] text-slate-500">Rp {formatRupiah(monthly)}</p>
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

          <div ref={outputRef} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{dyn('no_contract')}</p>
                <p className="text-base font-medium text-slate-700 dark:text-slate-300 truncate">{manual?.name ?? selected?.name ?? '-'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Unit {dyn('obj_desc')} {displayNopol} tahun {dyn('tahun')}</p>
                <div className="space-y-0.5 text-sm">
                  <p className="text-slate-600 dark:text-slate-400">
                    angsuran kurang <span className="font-semibold text-slate-800 dark:text-slate-200">{sisaAngsuran}×{formatRupiah(angsuranPerBulan)} = Rp {formatRupiah(totalAngsuran)}</span>
                  </p>
                  {dinego && (<p className="text-slate-600 dark:text-slate-400">dinego jadi Rp <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(parseRupiah(dinego))}</span></p>)}
                  <p className="text-slate-600 dark:text-slate-400">pinjaman maksimal cair Rp <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(pinjaman)}</span></p>
                  <p className="text-slate-600 dark:text-slate-400">pelunasan Rp <span className="font-semibold text-fif-600">{formatRupiah(pelunasan)}</span></p>
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold text-base">terima Rp {formatRupiah(terima)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const lines = [
                    `${dyn('no_contract') || '-'}`,
                    `${manual?.name ?? selected?.name ?? '-'}`,
                    `Unit ${dyn('obj_desc')}${displayNopol ? ` ${displayNopol}` : ''} tahun ${dyn('tahun')}`,
                    `angsuran kurang ${sisaAngsuran}×${formatRupiah(angsuranPerBulan)} = Rp ${formatRupiah(totalAngsuran)}`,
                    '',
                  ];
                  if (dinego) lines.push(`dinego jadi Rp ${formatRupiah(parseRupiah(dinego))}`);
                  lines.push(`pinjaman maksimal cair Rp ${formatRupiah(pinjaman)}`);
                  lines.push(`pelunasan Rp ${formatRupiah(pelunasan)}`);
                  lines.push(`terima Rp ${formatRupiah(terima)}`);
                  lines.push('');
                  (financeResult?.results ?? []).forEach((r) => {
                    if (visibleTenors.includes(r.tenor)) {
                      lines.push(`${r.tenor}×Rp ${formatRupiah(r.angsuran)}`);
                    }
                  });
                  navigator.clipboard.writeText(lines.join('\r\n')).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
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
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Rp {formatRupiah(monthly)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
    </div>
  );
}
