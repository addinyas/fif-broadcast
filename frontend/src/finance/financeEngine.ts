export interface TenorResult {
  tenor: number;
  gdp: number;
  ndp: number;
  ph: number;
  eff: number;
  flat: number;
  interestNet: number;
  splittingRateTotal: number;
  interestGross: number;
  totalHutang: number;
  angsuran: number;
}

export interface FinanceInput {
  pinjaman: number;
  rate: number;
  tenors: number[];
  hargaTaksasi?: number;
}

export interface FinanceOutput {
  results: TenorResult[];
  details: {
    hargaTaksasi: number;
    pinjaman: number;
    rate: number;
    eff: number;
  };
}

const RATE_EFF_MAP: Record<number, number> = {
  42: 0.43,
  43: 0.44,
  44: 0.45,
  45: 0.46,
  46: 0.47,
};

const FEES = {
  ms106: 50000,
  ms255: 20000,
  admMurni: 375000,
  ms882: 50000,
  ms93: 43000,
  ms56: 50000,
  ma368: 30000,
  ms04: 365000,
  ms45: 70000,
  ms272: 150000,
};

function effToFlat(eff: number, top: number): number {
  const r = eff / 12;
  return (((top * r) / (1 - (1 + r) ** -top)) - 1) * (12 / top);
}

function roundPlafon(raw: number): number {
  const remainder = raw % 100000;
  if (remainder < 50000) {
    return raw - remainder;
  }
  return raw - remainder + 50000;
}

export function calcPlafon(otr: string | number | undefined | null, cori: string | undefined | null): number {
  const otrNum = typeof otr === 'number' ? otr : parseInt(String(otr ?? '0').replace(/\D/g, '')) || 0;
  const coriUpper = (cori ?? '').toUpperCase();
  if (otrNum <= 0 || !coriUpper) return 0;
  if (coriUpper === 'BAD') return roundPlafon(otrNum * 0.65);
  if (coriUpper === 'MEDIUM') return roundPlafon(otrNum * 0.75);
  if (coriUpper === 'GOOD' || coriUpper === 'GOOD LOYAL') return roundPlafon(otrNum * 0.90);
  return 0;
}

export function calculateAngsuran(input: FinanceInput): FinanceOutput {
  const hargaTaksasi = input.hargaTaksasi ?? 40_000_000;
  const eff = RATE_EFF_MAP[input.rate] ?? 0.45;
  const { pinjaman, tenors } = input;

  const gdp = hargaTaksasi - pinjaman;

  const admEntry = FEES.ms255 + FEES.admMurni;

  const ndp = gdp - admEntry;

  const ph = hargaTaksasi - ndp;

  const splittingRateTotal =
    FEES.ms106 + FEES.ms882 + FEES.ms93 +
    FEES.ma368 + FEES.ms04 + FEES.ms45 + FEES.ms56 + FEES.ms272;

  const results: TenorResult[] = tenors.map((tenor) => {
    const flat = effToFlat(eff, tenor);
    const interestNet = ph * flat * tenor / 12;
    const interestGross = interestNet + splittingRateTotal;
    const totalHutang = ph + interestGross;
    const angsuran = Math.round(totalHutang / tenor / 5000) * 5000;

    return {
      tenor,
      gdp,
      ndp,
      ph,
      eff,
      flat,
      interestNet,
      splittingRateTotal,
      interestGross,
      totalHutang,
      angsuran,
    };
  });

  return {
    results,
    details: {
      hargaTaksasi,
      pinjaman,
      rate: input.rate,
      eff,
    },
  };
}
