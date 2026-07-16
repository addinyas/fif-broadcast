import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Copy, Check, Plus, Calculator, X } from 'lucide-react';
import { customerService } from '../services/customerService';
import { calculateAngsuran, calcPlafon } from '../finance/financeEngine';
import type { Customer } from '../types';

interface ManualCustomer {
  name: string;
  no_contract: string;
  obj_desc: string;
  tahun: string;
  otr: string;
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
  const [dendaChecked, setDendaChecked] = useState(false);
  const [dendaAmount, setDendaAmount] = useState('');
  const [adminChecked, setAdminChecked] = useState(false);
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

  const financeTenors = useMemo(
    () => isOldMotor && !tenors.includes(6) ? [6, ...tenors] : tenors,
    [isOldMotor, tenors],
  );
  const visibleTenors = useMemo(
    () => isOldMotor ? financeTenors.filter(t => t <= 24) : tenors,
    [isOldMotor, financeTenors, tenors],
  );

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
  const dendaManual = dendaChecked ? parseAngka(dendaAmount) : 0;
  const dendaAdmin = adminChecked ? 5000 : 0;
  const dendaVal = dendaManual + dendaAdmin;
  const pelunasanBase = dinego ? parseInt(dinego.replace(/\D/g, '')) || 0 : totalAngsuran;
  const pelunasan = pelunasanBase + dendaVal;
  const terima = Math.max(0, pinjaman - pelunasan);

  const hasRequiredInput = sisaAngsuran > 0 && angsuranPerBulan > 0 && pinjaman > 0 && nopol.trim() !== '';

  const formatAngka = (val: number | string) => {
    const nums = typeof val === 'string' ? val.replace(/\D/g, '') : String(val);
    if (!nums) return '';
    return nums.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatAlphaNum = (val: string, allowSpaces = false) => {
    const pattern = allowSpaces ? /[^A-Z0-9 ]/g : /[^A-Z0-9]/g;
    return val.toUpperCase().replace(/  +/g, ' ').replace(pattern, '');
  };

  const selectCustomer = (c: Customer) => {
    setSelected(c);
    setManual(null);
    setSearch('');
    setResults([]);
    const plafon = calcPlafon(c.dynamic_data?.otr, c.dynamic_data?.cori);
    setPinjaman(plafon);
    const sisa = String(c.dynamic_data?.sisa_angsuran ?? '0');
    setSisaAngsuran(parseInt(sisa) || 0);
    const angsuran = String(c.dynamic_data?.angsuran ?? c.dynamic_data?.angsuran_per_bulan ?? '0');
    setAngsuranPerBulan(parseAngka(angsuran));
    setDinego('');
    setDendaChecked(false);
    setDendaAmount('');
    setAdminChecked(false);
  };

  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400";

  const violetInput = "w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 dark:border-violet-800/50 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-violet-400";
  const indigoInput = "w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-indigo-800/50 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-indigo-400";

  const copyText = () => {
    const lines = [
      `${dyn('no_contract') || '-'}`,
      `${manual?.name ?? selected?.name ?? '-'}`,
      `Unit ${dyn('obj_desc')}${displayNopol ? ` ${displayNopol}` : ''} thn ${dyn('tahun')}`,
      `Angsuran Kurang ${sisaAngsuran}×${formatAngka(angsuranPerBulan)} = ${formatAngka(totalAngsuran)}${dendaVal > 0 ? ` + ${formatAngka(dendaVal)} (${[dendaChecked && 'denda perhari ini', adminChecked && 'admin'].filter(Boolean).join(' + ')})` : ''}`,
      '',
    ];
    if (dinego) { lines.push(`Dinego Jadi ${formatAngka(parseAngka(dinego))}`); lines.push(''); }
    lines.push(`Pinjaman Maksimal ${formatAngka(pinjaman)}`);
    lines.push(`Pelunasan ${formatAngka(pelunasan)}`);
    lines.push(`Terima ${formatAngka(terima)}`);
    lines.push('');
    const t = (financeResult?.results ?? []).filter((r) => visibleTenors.includes(r.tenor));
    if (t.length) {
      lines.push('Tenor Angsuran');
      t.forEach((r) => lines.push(`${r.tenor}× Rp ${formatAngka(r.angsuran)}`));
    }
    return lines.join('\r\n');
  };

  const handleCopy = () => {
    const text = copyText();
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
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Kalkulator</h1>
        <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">Hitung angsuran dan simulasi pinjaman</p>
      </div>

      {/* Search — pill style */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 dark:text-slate-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau no kontrak..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-fif-400 focus:bg-white focus:ring-4 focus:ring-fif-500/5 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:focus:border-fif-500 dark:focus:bg-slate-800"
            />
          </div>
          <button
            onClick={() => {
              if (manual) {
                setManual(null);
              } else {
                setManual({ name: search.trim() || '', no_contract: '', obj_desc: '', tahun: '', otr: '', angsuran: '', sisa_angsuran: '', nopol: '', cori: '', vcode: '' });
                setSearch('');
                setResults([]);
              }
            }}
            className={`shrink-0 flex items-center justify-center rounded-2xl px-4 text-sm font-medium transition-all ${manual ? 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' : 'bg-fif-50 text-fif-600 hover:bg-fif-100 dark:bg-fif-900/20 dark:text-fif-400'}`}
          >
            {manual ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-fif-50 dark:hover:bg-fif-900/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fif-50 text-xs font-bold text-fif-600 dark:bg-fif-900/30 dark:text-fif-400">
                  {(c.name || '?')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-700 dark:text-slate-200 truncate">{c.name}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {(c.dynamic_data?.no_contract as string) || '-'}
                    {(c.dynamic_data?.obj_desc as string) ? ` · ${c.dynamic_data?.obj_desc}` : ''}
                    {(c.dynamic_data?.tahun as string) ? ` ${c.dynamic_data?.tahun}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {search.trim().length >= 2 && results.length === 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <p className="text-sm text-slate-400 dark:text-slate-500">Data tidak ditemukan</p>
          </div>
        )}
      </div>

      {/* Manual input form — violet accent */}
      {manual && (
        <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white dark:border-violet-800/50 dark:from-violet-900/20 dark:to-slate-900">
          <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/50 px-5 py-3 dark:border-violet-800/30 dark:bg-violet-900/10">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Input Manual</span>
            </div>
            <button onClick={() => { setManual(null); setPinjaman(0); setAngsuranPerBulan(0); setSisaAngsuran(0); setDinego(''); setDendaChecked(false); setDendaAmount(''); setAdminChecked(false); }}
              className="text-xs text-violet-400 hover:text-violet-600 dark:text-violet-500 dark:hover:text-violet-300 transition-colors"
            >
              Hapus
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Nama <span className="text-red-400">*</span></label>
              <input value={manual.name}
                onChange={(e) => setManual({ ...manual, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                className={violetInput}
              />
            </div>
            <div>
              <label className={labelClass}>No Kontrak <span className="text-red-400">*</span></label>
              <input value={manual.no_contract}
                onChange={(e) => setManual({ ...manual, no_contract: e.target.value.replace(/\D/g, '') })}
                className={violetInput}
              />
            </div>
            <div>
              <label className={labelClass}>Unit <span className="text-red-400">*</span></label>
              <input value={formatAlphaNum(manual.obj_desc, true)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^A-Za-z0-9 ]/g, '');
                  setManual({ ...manual, obj_desc: formatAlphaNum(raw, true) });
                }}
                placeholder="mis: VARIO 160 CBS"
                className={violetInput}
              />
            </div>
            <div>
              <label className={labelClass}>Tahun <span className="text-red-400">*</span></label>
              <select value={manual.tahun}
                onChange={(e) => setManual({ ...manual, tahun: e.target.value })}
                className={violetInput}
              >
                <option value="">Pilih</option>
                {Array.from({ length: 2027 - 2010 + 1 }, (_, i) => 2010 + i).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>OTR / Harga Pasar (Rp) <span className="text-red-400">*</span></label>
              <input value={formatAngka(manual.otr)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setManual({ ...manual, otr: raw });
                  setPinjaman(calcPlafon(raw, manual.cori));
                }}
                placeholder="0"
                className={violetInput}
              />
            </div>
            <div>
              <label className={labelClass}>Angsuran/Bulan (Rp) <span className="text-red-400">*</span></label>
              <input value={formatAngka(manual.angsuran)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setManual({ ...manual, angsuran: raw });
                  setAngsuranPerBulan(parseInt(raw) || 0);
                }}
                placeholder="0"
                className={violetInput}
              />
            </div>
            <div>
              <label className={labelClass}>Sisa Angsuran (kali) <span className="text-red-400">*</span></label>
              <select value={manual.sisa_angsuran}
                onChange={(e) => {
                  setManual({ ...manual, sisa_angsuran: e.target.value });
                  setSisaAngsuran(parseInt(e.target.value) || 0);
                }}
                className={violetInput}
              >
                <option value="">Pilih</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}×</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nopol <span className="text-red-400">*</span></label>
              <input type="text" inputMode="text" autoComplete="off" pattern="[A-Za-z0-9]*" autoCapitalize="characters" autoCorrect="off" spellCheck={false} value={formatAlphaNum(manual.nopol)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^A-Za-z0-9 ]/g, '');
                  const formatted = formatAlphaNum(raw);
                  setManual({ ...manual, nopol: formatted });
                  setNopol(formatted);
                }}
                placeholder="mis: AB6116JN"
                className={violetInput}
              />
            </div>
            <div>
              <label className={labelClass}>CORI</label>
              <select value={manual.cori}
                onChange={(e) => {
                  const newCori = e.target.value;
                  setManual({ ...manual, cori: newCori });
                  setPinjaman(calcPlafon(manual.otr, newCori));
                }}
                className={violetInput}
              >
                <option value="">Pilih</option>
                <option value="BAD">BAD</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="GOOD">GOOD</option>
                <option value="GOOD LOYAL">GOOD LOYAL</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Vcode</label>
              <input value={manual.vcode}
                onChange={(e) => setManual({ ...manual, vcode: e.target.value.toUpperCase() })}
                placeholder="Vcode"
                className={violetInput}
              />
            </div>
            <div>
              <label className={labelClass}>Pelunasan Nego</label>
              <input value={formatAngka(dinego)}
                onChange={(e) => setDinego(e.target.value.replace(/\D/g, ''))}
                placeholder="Rp (opsional)"
                className={violetInput}
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className={labelClass}>Denda & Admin</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={dendaChecked}
                    onChange={(e) => { setDendaChecked(e.target.checked); if (!e.target.checked) setDendaAmount(''); }}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Denda Harian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={adminChecked}
                    onChange={(e) => setAdminChecked(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-400"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Admin <span className="text-blue-500">Rp 5.000</span></span>
                </label>
              </div>
              {dendaChecked && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 animate-fade-in dark:border-amber-800/50 dark:bg-amber-900/20">
                  <span className="text-xs text-amber-500 dark:text-amber-400 shrink-0 font-medium">Rp</span>
                  <input value={formatAngka(dendaAmount)}
                    onChange={(e) => setDendaAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    autoFocus
                    className="w-full bg-transparent text-sm font-medium text-amber-700 outline-none placeholder:text-amber-300 dark:text-amber-300 dark:placeholder:text-amber-600"
                  />
                  <button onClick={() => { setDendaChecked(false); setDendaAmount(''); }}
                    className="shrink-0 rounded-lg p-1 text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected customer — compact info strip */}
      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:flex sm:items-center sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fif-50 text-sm font-bold text-fif-600 dark:bg-fif-900/30 dark:text-fif-400">
              {(selected.name || '?')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{selected.name}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{dyn('no_contract')} · {dyn('obj_desc')} {dyn('tahun')}</p>
            </div>
            <button onClick={() => { setSelected(null); setManual(null); setPinjaman(0); setDendaChecked(false); setDendaAmount(''); setAdminChecked(false); }}
              className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors sm:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs sm:mt-0 sm:justify-start sm:gap-3">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">OTR</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{dyn('otr') ? `Rp ${formatAngka(dyn('otr'))}` : '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">CORI</p>
              <select
                value={(dyn('cori') || '').toUpperCase()}
                onChange={(e) => {
                  if (!selected || !e.target.value) return;
                  const newCori = e.target.value;
                  const otr = selected.dynamic_data?.otr;
                  setSelected((prev) => prev ? { ...prev, dynamic_data: { ...prev.dynamic_data, cori: newCori } } : prev);
                  setPinjaman(calcPlafon(otr, newCori));
                  customerService.updateCori(selected.id, newCori).catch(() => {});
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="">Pilih</option>
                <option value="BAD">BAD</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="GOOD">GOOD</option>
                <option value="GOOD LOYAL">GOOD LOYAL</option>
              </select>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Vcode</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{dyn('vcode') || '-'}</p>
            </div>
            <button onClick={() => { setSelected(null); setManual(null); setPinjaman(0); setDendaChecked(false); setDendaAmount(''); setAdminChecked(false); }}
              className="hidden shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors sm:block"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main grid — Input (slate) + Output (teal) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Input card — indigo accent */}
        <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-800/50 dark:from-indigo-900/20 dark:to-slate-900">
          <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50/50 px-5 py-3 dark:border-indigo-800/30 dark:bg-indigo-900/10">
            <div className="h-5 w-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Input</h3>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label className={labelClass}>Sisa Angsuran (kali) <span className="text-red-400">*</span></label>
              <select value={sisaAngsuran || ''}
                onChange={(e) => setSisaAngsuran(parseInt(e.target.value) || 0)}
                className={indigoInput}
              >
                <option value="">Pilih</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}×</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Angsuran Kontrak Aktif / Bulan <span className="text-red-400">*</span></label>
              <input
                value={angsuranPerBulan ? formatAngka(angsuranPerBulan) : ''}
                onChange={(e) => setAngsuranPerBulan(parseAngka(e.target.value))}
                placeholder="0"
                className={indigoInput}
              />
            </div>
            <div>
              <label className={labelClass}>Pelunasan Nego</label>
              <input value={formatAngka(dinego)}
                onChange={(e) => setDinego(e.target.value.replace(/\D/g, ''))}
                placeholder="Rp (opsional)"
                className={indigoInput}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={dendaChecked}
                    onChange={(e) => { setDendaChecked(e.target.checked); if (!e.target.checked) setDendaAmount(''); }}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Denda Harian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={adminChecked}
                    onChange={(e) => setAdminChecked(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-400"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Admin <span className="text-blue-500">Rp 5.000</span></span>
                </label>
              </div>
              {dendaChecked && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 animate-fade-in dark:border-amber-800/50 dark:bg-amber-900/20">
                  <span className="text-xs text-amber-500 dark:text-amber-400 shrink-0 font-medium">Rp</span>
                  <input value={formatAngka(dendaAmount)}
                    onChange={(e) => setDendaAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    autoFocus
                    className="w-full bg-transparent text-sm font-medium text-amber-700 outline-none placeholder:text-amber-300 dark:text-amber-300 dark:placeholder:text-amber-600"
                  />
                  <button onClick={() => { setDendaChecked(false); setDendaAmount(''); }}
                    className="shrink-0 rounded-lg p-1 text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Plafon / Pinjaman <span className="text-red-400">*</span></label>
              <input
                value={pinjaman ? formatAngka(pinjaman) : ''}
                onChange={(e) => setPinjaman(parseAngka(e.target.value))}
                placeholder="0"
                className={indigoInput}
              />
            </div>
            <div>
              <label className={labelClass}>Nopol <span className="text-red-400">*</span></label>
              <input type="text" inputMode="text" autoComplete="off" pattern="[A-Za-z0-9]*" autoCapitalize="characters" autoCorrect="off" spellCheck={false} value={formatAlphaNum(nopol)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^A-Za-z0-9 ]/g, '');
                  setNopol(formatAlphaNum(raw));
                }}
                placeholder="mis: AB6116JN"
                className={indigoInput}
              />
            </div>
          </div>
        </div>

        {/* Output card — teal accent */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 dark:border-teal-800/40 dark:from-teal-900/15 dark:to-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-teal-400 dark:bg-teal-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Hasil</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 dark:bg-slate-800/80">
              <span className="text-slate-400 text-xs">Angsuran Kurang</span>
              <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">{sisaAngsuran}×{formatAngka(angsuranPerBulan)} = {formatAngka(totalAngsuran)}</span>
            </div>
            {dendaVal > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 dark:bg-slate-800/80">
                <span className="text-slate-400 text-xs">Denda</span>
                <span className="font-mono font-semibold tabular-nums text-red-500">{formatAngka(dendaVal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 dark:bg-slate-800/80">
              <span className="text-slate-400 text-xs">Pelunasan</span>
              <span className="font-mono font-semibold tabular-nums text-fif-600 dark:text-fif-400">{formatAngka(pelunasan)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 shadow-lg shadow-teal-500/20">
              <span className="font-semibold text-sm text-teal-50">Terima</span>
              <span className="font-mono font-bold tabular-nums text-base text-white">{formatAngka(terima)}</span>
            </div>
          </div>

          <div className="mt-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tenor Angsuran</h4>
            <div className="grid grid-cols-5 gap-1.5">
              {visibleTenors.map((n, i) => {
                const idx = financeTenors.indexOf(n);
                const monthly = idx !== -1 ? (financeResult?.results[idx]?.angsuran ?? 0) : 0;
                return (
                  <div key={i} className="rounded-xl border border-slate-100 bg-white py-2 text-center dark:border-slate-700 dark:bg-slate-800/80">
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
                      className="mb-0.5 w-full text-center text-sm font-bold outline-none bg-transparent text-fif-600 dark:text-fif-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Rp {formatAngka(monthly)}</p>
                  </div>
                );
              })}
            </div>
            {isOldMotor && (
              <p className="mt-2 text-[10px] text-amber-500 font-medium">Tahun Motor {customerTahun}, Min 6× & Max 24×</p>
            )}
            <p className="mt-1 text-[10px] text-slate-300 dark:text-slate-600 italic">Klik angka tenor untuk mengubah</p>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="w-full max-w-[200px]">
              <label className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Rate</label>
              <select
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-fif-200 bg-fif-50 px-4 py-2.5 text-center text-base font-bold text-fif-700 outline-none transition-all focus:border-fif-500 focus:ring-4 focus:ring-fif-500/10 appearance-none cursor-pointer dark:border-fif-700 dark:bg-fif-900/20 dark:text-fif-300"
              >
                {[42, 43, 44, 45, 46].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Result card — receipt style */}
      {hasRequiredInput ? (
        <div ref={outputRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
          <div className="relative bg-gradient-to-r from-fif-600 to-fif-500 px-5 py-3">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkg0di0yaDM2em0wLTR2MkgxNHYtMmgzMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><Calculator className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-sm font-bold tracking-wide text-white">{dyn('no_contract')}</p>
                  <p className="text-[11px] text-fif-100">{manual?.name ?? selected?.name ?? '-'}</p>
                </div>
              </div>
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95"
              >
                {copied ? <><Check className="h-3.5 w-3.5" /> Tersalin</> : <><Copy className="h-3.5 w-3.5" /> Salin</>}
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Unit {dyn('obj_desc')} {displayNopol} thn {dyn('tahun')}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Angsuran Kurang</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{sisaAngsuran}×{formatAngka(angsuranPerBulan)} = {formatAngka(totalAngsuran)}{dendaVal > 0 ? <span className="ml-1 text-red-500">+{formatAngka(dendaVal)} ({[dendaChecked && 'denda perhari ini', adminChecked && 'admin'].filter(Boolean).join(' + ')})</span> : ''}</span>
              </div>
              {dinego && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Dinego Jadi</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatAngka(parseAngka(dinego))}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Pinjaman Maksimal</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{formatAngka(pinjaman)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Pelunasan</span>
                <span className="font-semibold text-fif-600 dark:text-fif-400">{formatAngka(pelunasan)}</span>
              </div>
            </div>
            <div className="my-3 border-t border-dashed border-slate-200 dark:border-slate-600" />
            <div className="rounded-xl bg-gradient-to-r from-fif-50 to-fif-100 px-4 py-3 dark:from-fif-900/30 dark:to-fif-800/30">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fif-500 dark:text-fif-400">Diterima</p>
              <p className="text-xl font-bold text-fif-700 dark:text-fif-300">{formatAngka(terima)}</p>
            </div>
            {(financeResult?.results ?? []).some((r) => visibleTenors.includes(r.tenor)) && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tenor Angsuran</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {(financeResult?.results ?? []).filter((r) => visibleTenors.includes(r.tenor)).map((r, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 py-1.5 text-center dark:border-slate-700 dark:bg-slate-700/50">
                      <p className="text-[10px] font-bold text-fif-600 dark:text-fif-400">{r.tenor}×</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Rp {formatAngka(r.angsuran)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/30">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Calculator className="h-5 w-5 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">Isi semua field wajib untuk melihat rincian</p>
        </div>
      )}
    </div>
  );
}
