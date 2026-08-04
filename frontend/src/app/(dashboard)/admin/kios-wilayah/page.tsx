'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, CheckSquare, Square, ChevronDown, ChevronRight, Lock, Ban } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cabangWilayahService, type CabangWithWilayah } from '@/services/cabangWilayahService';

const KABUPATEN_ORDER: Record<string, string> = {
  'Kota Yogyakarta': '01',
  'Sleman': '02',
  'Bantul': '03',
  'Kulon Progo': '04',
};

const KECAMATAN_LIST: { kecamatan: string; kabupaten: string }[] = [
  { kecamatan: 'Danurejan',     kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Gedongtengen',  kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Gondokusuman',  kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Gondomanan',    kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Jetis',         kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Kotagede',      kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Kraton',        kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Mantrijeron',   kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Mergangsan',    kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Ngampilan',     kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Pakualaman',    kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Tegalrejo',     kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Umbulharjo',    kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Wirobrajan',    kabupaten: 'Kota Yogyakarta' },
  { kecamatan: 'Berbah',        kabupaten: 'Sleman' },
  { kecamatan: 'Cangkringan',   kabupaten: 'Sleman' },
  { kecamatan: 'Depok',         kabupaten: 'Sleman' },
  { kecamatan: 'Gamping',       kabupaten: 'Sleman' },
  { kecamatan: 'Godean',        kabupaten: 'Sleman' },
  { kecamatan: 'Kalasan',       kabupaten: 'Sleman' },
  { kecamatan: 'Minggir',       kabupaten: 'Sleman' },
  { kecamatan: 'Mlati',         kabupaten: 'Sleman' },
  { kecamatan: 'Moyudan',       kabupaten: 'Sleman' },
  { kecamatan: 'Ngaglik',       kabupaten: 'Sleman' },
  { kecamatan: 'Ngemplak',      kabupaten: 'Sleman' },
  { kecamatan: 'Pakem',         kabupaten: 'Sleman' },
  { kecamatan: 'Prambanan',     kabupaten: 'Sleman' },
  { kecamatan: 'Seyegan',       kabupaten: 'Sleman' },
  { kecamatan: 'Sleman',        kabupaten: 'Sleman' },
  { kecamatan: 'Tempel',        kabupaten: 'Sleman' },
  { kecamatan: 'Turi',          kabupaten: 'Sleman' },
  { kecamatan: 'Bambanglipuro', kabupaten: 'Bantul' },
  { kecamatan: 'Banguntapan',   kabupaten: 'Bantul' },
  { kecamatan: 'Bantul',        kabupaten: 'Bantul' },
  { kecamatan: 'Dlingo',        kabupaten: 'Bantul' },
  { kecamatan: 'Imogiri',       kabupaten: 'Bantul' },
  { kecamatan: 'Jetis',         kabupaten: 'Bantul' },
  { kecamatan: 'Kasihan',       kabupaten: 'Bantul' },
  { kecamatan: 'Kretek',        kabupaten: 'Bantul' },
  { kecamatan: 'Pajangan',      kabupaten: 'Bantul' },
  { kecamatan: 'Pandak',        kabupaten: 'Bantul' },
  { kecamatan: 'Piyungan',      kabupaten: 'Bantul' },
  { kecamatan: 'Pleret',        kabupaten: 'Bantul' },
  { kecamatan: 'Pundong',       kabupaten: 'Bantul' },
  { kecamatan: 'Sanden',        kabupaten: 'Bantul' },
  { kecamatan: 'Sedayu',        kabupaten: 'Bantul' },
  { kecamatan: 'Sewon',         kabupaten: 'Bantul' },
  { kecamatan: 'Srandakan',     kabupaten: 'Bantul' },
  { kecamatan: 'Galur',         kabupaten: 'Kulon Progo' },
  { kecamatan: 'Girimulyo',     kabupaten: 'Kulon Progo' },
  { kecamatan: 'Kalibawang',    kabupaten: 'Kulon Progo' },
  { kecamatan: 'Kokap',         kabupaten: 'Kulon Progo' },
  { kecamatan: 'Lendah',        kabupaten: 'Kulon Progo' },
  { kecamatan: 'Nanggulan',     kabupaten: 'Kulon Progo' },
  { kecamatan: 'Panjatan',      kabupaten: 'Kulon Progo' },
  { kecamatan: 'Pengasih',      kabupaten: 'Kulon Progo' },
  { kecamatan: 'Samigaluh',     kabupaten: 'Kulon Progo' },
  { kecamatan: 'Sentolo',       kabupaten: 'Kulon Progo' },
  { kecamatan: 'Temon',         kabupaten: 'Kulon Progo' },
  { kecamatan: 'Wates',         kabupaten: 'Kulon Progo' },
];

const KELURAHAN_PER_KECAMATAN: Record<string, string[]> = {
  Danurejan: ['Bausasran', 'Tegalpanggung', 'Suryatmajan'],
  Gedongtengen: ['Pringgokusuman', 'Sosromenduran'],
  Gondokusuman: ['Baciro', 'Demangan', 'Klitren', 'Kotabaru', 'Terban'],
  Gondomanan: ['Ngupasan', 'Prawirodirjan'],
  Kotagede: ['Prenggan', 'Purbayan', 'Rejowinangun'],
  Kraton: ['Panembahan', 'Kadipaten', 'Patehan'],
  Mantrijeron: ['Gedongkiwo', 'Suryodiningratan', 'Mantrijeron'],
  Mergangsan: ['Brontokusuman', 'Keparakan', 'Wirogunan'],
  Ngampilan: ['Ngampilan', 'Notoprajan'],
  Pakualaman: ['Gunungketur', 'Purwokinanti'],
  Tegalrejo: ['Bener', 'Karangwaru', 'Kricak', 'Tegalrejo'],
  Umbulharjo: ['Pandeyan', 'Sorosutan', 'Giwangan', 'Warungboto', 'Mujamuju', 'Semaki', 'Tahunan'],
  Wirobrajan: ['Pakuncen', 'Patangpuluhan', 'Wirobrajan'],
  Berbah: ['Jogotirto', 'Kalitirto', 'Sendangtirto', 'Tegaltirto'],
  Cangkringan: ['Argomulyo', 'Glagaharjo', 'Kepuharjo', 'Wukisari', 'Umbulharjo'],
  Depok: ['Caturtunggal', 'Condongcatur', 'Maguwoharjo'],
  Gamping: ['Ambarketawang', 'Balecatur', 'Banyuraden', 'Nogotirto', 'Trihanggo'],
  Godean: ['Sidoagung', 'Sidoarum', 'Sidokarto', 'Sidoluhur', 'Sidomoyo', 'Sidomulyo', 'Sidorejo'],
  Kalasan: ['Purwomartani', 'Selomartani', 'Tamanmartani', 'Tirtomartani'],
  Minggir: ['Sendangagung', 'Sendangarum', 'Sendangmulyo', 'Sendangrejo', 'Sendangsari'],
  Mlati: ['Sendangadi', 'Sinduadi', 'Sumberadi', 'Tirtoadi', 'Tlogoadi'],
  Moyudan: ['Sumberagung', 'Sumberarum', 'Sumberrahayu', 'Sumbersari'],
  Ngaglik: ['Donoharjo', 'Minomartani', 'Sardonoharjo', 'Sariharjo', 'Sinduharjo', 'Sukoharjo'],
  Ngemplak: ['Bimomartani', 'Sindumartani', 'Umbulmartani', 'Wedomartani', 'Widodomartani'],
  Pakem: ['Candibinangun', 'Hargobinangun', 'Harjobinangun', 'Pakembinangun', 'Purwobinangun'],
  Prambanan: ['Bokoharjo', 'Gayamharjo', 'Madurejo', 'Sambirejo', 'Sumberharjo', 'Wukirharjo'],
  Seyegan: ['Margoagung', 'Margodadi', 'Margokaton', 'Margoluwih', 'Margomulyo'],
  Sleman: ['Caturharjo', 'Pandowoharjo', 'Tridadi', 'Triharjo', 'Trimulyo'],
  Tempel: ['Banyurejo', 'Lumbungrejo', 'Margorejo', 'Merdikorejo', 'Mororejo', 'Pondokrejo', 'Sumberejo', 'Tambakrejo'],
  Turi: ['Bangunkerto', 'Donokerto', 'Girikerto', 'Wonokerto'],
  Bambanglipuro: ['Mulyodadi', 'Sidomulyo', 'Sumbermulyo'],
  Banguntapan: ['Banguntapan', 'Baturetno', 'Jagalan', 'Jambidan', 'Potorono', 'Singosaren', 'Tamanan', 'Wirokerten'],
  Bantul: ['Bantul', 'Palbapang', 'Ringinharjo', 'Sabdodadi', 'Trirenggo'],
  Dlingo: ['Dlingo', 'Jatimulyo', 'Mangunan', 'Muntuk', 'Temuwuh', 'Terong'],
  Imogiri: ['Girirejo', 'Imogiri', 'Karangtalun', 'Karangtengah', 'Kebonagung', 'Selopamioro', 'Sriharjo', 'Wukirsari'],
  Kasihan: ['Bangunjiwo', 'Ngestiharjo', 'Tamantirto', 'Tirtonirmolo'],
  Kretek: ['Donotirto', 'Parangtritis', 'Tirtohargo', 'Tirtomulyo', 'Tirtosari'],
  Pajangan: ['Guwosari', 'Sendangsari', 'Triwidadi'],
  Pandak: ['Caturharjo', 'Gilangharjo', 'Triharjo', 'Wijirejo'],
  Piyungan: ['Srimulyo', 'Sitimulyo', 'Srimartani'],
  Pleret: ['Bawuran', 'Pleret', 'Segoroyoso', 'Wonokromo', 'Wonolelo'],
  Pundong: ['Panjangrejo', 'Seloharjo', 'Srihardono'],
  Sanden: ['Gadingsari', 'Gadingharjo', 'Murtigading', 'Srigading'],
  Sedayu: ['Argodadi', 'Argorejo', 'Argosari', 'Argomulyo'],
  Sewon: ['Bangunharjo', 'Panggungharjo', 'Pendowoharjo', 'Timbulharjo'],
  Srandakan: ['Poncosari', 'Trimurti'],
  Galur: ['Banaran', 'Brosot', 'Karangsewu', 'Kranggan', 'Nomporejo', 'Pandowan', 'Tirtarahayu'],
  Girimulyo: ['Giripurwo', 'Jatimulyo', 'Pendoworejo', 'Purwosari'],
  Kalibawang: ['Banjararum', 'Banjarasri', 'Banjarharjo', 'Banjaroyo'],
  Kokap: ['Hargomulyo', 'Hargorejo', 'Hargotirto', 'Hargowilis', 'Kalirejo'],
  Lendah: ['Bumirejo', 'Gulurejo', 'Jatirejo', 'Ngentakrejo', 'Sidorejo', 'Wahyuharjo'],
  Nanggulan: ['Banyuroto', 'Kembang', 'Donomulyo', 'Jatisarono', 'Tanjungharjo', 'Wijimulyo'],
  Panjatan: ['Bojong', 'Bugel', 'Cerme', 'Depok', 'Garongan', 'Gotakan', 'Kanoman', 'Krembangan', 'Panjatan', 'Pleret', 'Tayuban'],
  Pengasih: ['Karangsari', 'Kedungsari', 'Margosari', 'Pengasih', 'Sidomulyo', 'Sendangsari', 'Tawangsari'],
  Samigaluh: ['Banjarsari', 'Gerbosari', 'Kebonharjo', 'Ngargosari', 'Pagerharjo', 'Purwoharjo', 'Sidoharjo'],
  Sentolo: ['Banguncipto', 'Demangrejo', 'Kaliagung', 'Salamrejo', 'Sentolo', 'Srikayangan', 'Sukoreno', 'Tuksono'],
  Temon: ['Demen', 'Glagah', 'Jangkaran', 'Janten', 'Kalidengen', 'Kaligintung', 'Karangwuluh', 'Kebonrejo', 'Kedundang', 'Kulur', 'Palihan', 'Plumbon', 'Sindutan', 'Temon Kulon', 'Temon Wetan'],
  Wates: ['Bendungan', 'Giripeni', 'Karangwuni', 'Kulwaru', 'Ngestiharjo', 'Sogan', 'Triharjo', 'Wates'],
};

const JETIS_YOGYA = ['Bumijo', 'Cokrodiningratan', 'Gowongan'];
const JETIS_BANTUL = ['Canden', 'Patalan', 'Sumberagung', 'Trimulyo'];

const sortedKecamatan = [...KECAMATAN_LIST].sort((a, b) => {
  const ka = KABUPATEN_ORDER[a.kabupaten] || '99';
  const kb = KABUPATEN_ORDER[b.kabupaten] || '99';
  return ka.localeCompare(kb) || a.kecamatan.localeCompare(b.kecamatan);
});

const KABUPATEN_GROUPS = sortedKecamatan.reduce<Record<string, { kabupaten: string; kecamatan: string; kelurahan: string[] }[]>>((acc, item) => {
  if (item.kecamatan === 'Jetis') return acc;
  const kels = KELURAHAN_PER_KECAMATAN[item.kecamatan] || [];
  if (!acc[item.kabupaten]) acc[item.kabupaten] = [];
  acc[item.kabupaten].push({ kabupaten: item.kabupaten, kecamatan: item.kecamatan, kelurahan: kels });
  return acc;
}, {});

function makeKey(kabupaten: string, kecamatan: string, kelurahan: string | null): string {
  return [kabupaten, kecamatan, kelurahan].filter(Boolean).join('::');
}

function isRenderableRow(kabupaten: string, kecamatan: string, kelurahan: string | null): boolean {
  if (!kabupaten || !kelurahan) return false;
  if (kecamatan === 'Jetis') {
    if (kabupaten === 'Kota Yogyakarta') return JETIS_YOGYA.includes(kelurahan);
    if (kabupaten === 'Bantul') return JETIS_BANTUL.includes(kelurahan);
    return false;
  }
  return (KELURAHAN_PER_KECAMATAN[kecamatan] || []).includes(kelurahan);
}

const CABANGS = [
  { id: '40200', name: 'Sleman 2', color: 'fif' },
  { id: '43800', name: 'Yogyakarta', color: 'violet' },
] as const;

export default function CabangWilayahPage() {
  const { toast } = useToast();
  const [data, setData] = useState<CabangWithWilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCabang, setSelectedCabang] = useState<string>('40200');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expandedKec, setExpandedKec] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const otherCabangId = selectedCabang === '40200' ? '43800' : '40200';

  const selected = useMemo(
    () => data.find((c) => c.cabang_id === selectedCabang),
    [data, selectedCabang]
  );

  const other = useMemo(
    () => data.find((c) => c.cabang_id === otherCabangId),
    [data, otherCabangId]
  );

  const { otherWilayahKeys, otherCabangName } = useMemo(() => {
    const keys = new Set<string>();
    if (other) {
      for (const w of other.wilayah) {
        keys.add(makeKey(w.kabupaten_kota, w.kecamatan, w.kelurahan));
      }
    }
    return { otherWilayahKeys: keys, otherCabangName: other?.cabang_name ?? '' };
  }, [other]);

  const fetchData = useCallback(async () => {
    try {
      const res = await cabangWilayahService.getAll();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selected) return;
    const newChecked = new Set<string>();
    for (const w of selected.wilayah) {
      if (isRenderableRow(w.kabupaten_kota, w.kecamatan, w.kelurahan)) {
        newChecked.add(makeKey(w.kabupaten_kota, w.kecamatan, w.kelurahan));
      }
    }
    setChecked(newChecked);
  }, [selected]);

  const toggleKelurahan = (kabupaten: string, kecamatan: string, kelurahan: string | null) => {
    const key = makeKey(kabupaten, kecamatan, kelurahan);
    if (otherWilayahKeys.has(key)) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleKecamatan = (kabupaten: string, kecamatan: string, kels: string[]) => {
    if (kels.length === 0) {
      toggleKelurahan(kabupaten, kecamatan, null);
      return;
    }
    const kelsWithKey = kels.map((kel) => makeKey(kabupaten, kecamatan, kel));
    const allLocked = kelsWithKey.every((k) => otherWilayahKeys.has(k));
    if (allLocked) return;

    const eligible = kels.filter((kel) => !otherWilayahKeys.has(makeKey(kabupaten, kecamatan, kel)));
    const allChecked = eligible.every((kel) => checked.has(makeKey(kabupaten, kecamatan, kel)));

    setChecked((prev) => {
      const next = new Set(prev);
      for (const kel of eligible) {
        const key = makeKey(kabupaten, kecamatan, kel);
        if (allChecked) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const wilayah: { kabupaten_kota: string; kecamatan: string; kelurahan: string | null }[] = [];
      for (const key of checked) {
        const [kab, kec, kel] = key.split('::');
        wilayah.push({ kabupaten_kota: kab, kecamatan: kec, kelurahan: kel || null });
      }
      await cabangWilayahService.update(selectedCabang, { wilayah, replace: true });
      toast('success', `Wilayah cabang ${selectedCabang} berhasil disimpan`);
      fetchData();
    } catch {
      toast('error', 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-fif-500 border-t-transparent" />
      </div>
    );
  }

  const checkedCount = checked.size;
  const selectedName = selected?.cabang_name ?? '';

  const otherDisplayName = `${otherCabangId} ${otherCabangName}`;

  const renderKelurahanCheckboxes = (kabupaten: string, kecamatan: string, kels: string[]) => {
    const kecKey = makeKey(kabupaten, kecamatan, null);
    const isExpanded = expandedKec.has(kecKey);
    const kelsWithKey = kels.map((kel) => makeKey(kabupaten, kecamatan, kel));
    const allLocked = kels.length > 0 && kelsWithKey.every((k) => otherWilayahKeys.has(k));
    const eligible = kels.filter((kel) => !otherWilayahKeys.has(makeKey(kabupaten, kecamatan, kel)));
    const allEligibleChecked = eligible.length > 0 && eligible.every((kel) => checked.has(makeKey(kabupaten, kecamatan, kel)));

    if (allLocked) {
      return (
        <div key={kecKey} className="border-b border-slate-100 dark:border-slate-800 last:border-0 opacity-50">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span className="font-medium text-slate-400 line-through">{kecamatan}</span>
            <span className="text-xs text-slate-400">({kels.length} kelurahan — milik {otherDisplayName})</span>
          </div>
        </div>
      );
    }

    const kecLocked = otherWilayahKeys.has(kecKey);

    return (
      <div key={kecKey} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
        <button
          onClick={() => {
            if (kels.length > 0) setExpandedKec((prev) => {
              const next = new Set(prev);
              if (next.has(kecKey)) next.delete(kecKey);
              else next.add(kecKey);
              return next;
            });
            toggleKecamatan(kabupaten, kecamatan, kels);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          {kels.length > 0 ? (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          ) : kecLocked ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          {kecLocked ? (
            <Lock className="h-4 w-4 shrink-0 text-slate-300" />
          ) : allEligibleChecked ? (
            <CheckSquare className="h-4 w-4 shrink-0 text-fif-600" />
          ) : (
            <Square className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className={`font-medium ${kecLocked ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
            {kecamatan}
          </span>
          <span className="text-xs text-slate-400">
            {kecLocked
              ? `— milik ${otherDisplayName}`
              : `(${kels.length} ${kels.length === 1 ? 'kelurahan' : 'kelurahan'})`}
          </span>
        </button>
        {isExpanded && kels.length > 0 && (
          <div className="ml-7 border-l border-slate-200 dark:border-slate-700 pb-1">
            {kels.map((kel) => {
              const key = makeKey(kabupaten, kecamatan, kel);
              const isChecked = checked.has(key);
              const isLocked = otherWilayahKeys.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleKelurahan(kabupaten, kecamatan, kel)}
                  disabled={isLocked}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                    isLocked
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  ) : isChecked ? (
                    <CheckSquare className="h-3.5 w-3.5 shrink-0 text-fif-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  )}
                  <span className={`${isLocked ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-400'}`}>
                    {kel}
                  </span>
                  {isLocked && (
                    <span className="ml-auto text-[10px] text-slate-400">{otherDisplayName}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Wilayah Cabang</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Atur wilayah (kecamatan/kelurahan) yang ditanggung setiap cabang. Setiap wilayah hanya bisa dimiliki satu cabang.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CABANGS.map((cabang) => {
          const cabangData = data.find((c) => c.cabang_id === cabang.id);
          const wilCount = cabangData?.wilayah.length ?? 0;
          const kiosCount = cabangData?.kios.length ?? 0;
          const isSelected = selectedCabang === cabang.id;
          return (
            <button
              key={cabang.id}
              onClick={() => setSelectedCabang(cabang.id)}
              className={`rounded-2xl border-2 p-5 text-left transition-all ${
                isSelected
                  ? 'border-fif-500 bg-fif-50/50 shadow-md dark:border-fif-400 dark:bg-fif-900/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {cabang.id}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{cabang.name}</p>
                </div>
                {isSelected && (
                  <span className="rounded-full bg-fif-100 px-2.5 py-0.5 text-[11px] font-semibold text-fif-700 dark:bg-fif-900/30 dark:text-fif-300">
                    Dipilih
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{kiosCount} kios</span>
                <span>{wilCount} wilayah</span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <Card>
          <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {selectedCabang} — {selectedName}
              </h2>
              <p className="text-xs text-slate-500">
                {checkedCount} wilayah dipilih
                {' · '}
                <span className="text-amber-600 dark:text-amber-400">
                  <Lock className="-mt-0.5 mr-0.5 inline h-3 w-3" />
                  {otherWilayahKeys.size} wilayah milik {otherDisplayName} (terkunci)
                </span>
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(KABUPATEN_GROUPS).map(([kabupaten, kecamatans]) => (
              <div key={kabupaten} className="border-r border-b border-slate-200 dark:border-slate-700 last:border-0">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  {kabupaten}
                </div>
                {kecamatans.map((k) => renderKelurahanCheckboxes(k.kabupaten, k.kecamatan, k.kelurahan))}
                {kabupaten === 'Kota Yogyakarta' && renderKelurahanCheckboxes('Kota Yogyakarta', 'Jetis', JETIS_YOGYA)}
                {kabupaten === 'Bantul' && renderKelurahanCheckboxes('Bantul', 'Jetis', JETIS_BANTUL)}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
