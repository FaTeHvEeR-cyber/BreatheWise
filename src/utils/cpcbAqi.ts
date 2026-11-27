import type {
  CpcbAqiResult,
  CpcbCategoryMeta,
  CpcbCategoryName,
  PollutantKey,
  PollutantSubIndex,
  RawPollutantReadings,
} from '../types';

export interface BreakpointRow {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

export const CPCB_CATEGORIES: readonly CpcbCategoryMeta[] = [
  {
    name: 'Good',
    rangeLabel: '0–50',
    minAqi: 0,
    maxAqi: 50,
    textColorClass: 'text-[#166534]',
    surfaceClass: 'bg-[#F0FDF4]',
    borderClass: 'border-[#BBF7D0]',
    barColorHex: '#15803D',
    healthImpact: 'Minimal impact on urban residents and sensitive groups.',
  },
  {
    name: 'Satisfactory',
    rangeLabel: '51–100',
    minAqi: 51,
    maxAqi: 100,
    textColorClass: 'text-[#3F6212]',
    surfaceClass: 'bg-[#F7FEE7]',
    borderClass: 'border-[#D9F99D]',
    barColorHex: '#4D7C0F',
    healthImpact: 'Minor breathing discomfort possible for unusually sensitive people.',
  },
  {
    name: 'Moderate',
    rangeLabel: '101–200',
    minAqi: 101,
    maxAqi: 200,
    textColorClass: 'text-[#92400E]',
    surfaceClass: 'bg-[#FFFBEB]',
    borderClass: 'border-[#FDE68A]',
    barColorHex: '#B45309',
    healthImpact: 'Breathing discomfort for people with asthma, lung, or heart conditions.',
  },
  {
    name: 'Poor',
    rangeLabel: '201–300',
    minAqi: 201,
    maxAqi: 300,
    textColorClass: 'text-[#9A3412]',
    surfaceClass: 'bg-[#FFF7ED]',
    borderClass: 'border-[#FED7AA]',
    barColorHex: '#C2410C',
    healthImpact: 'Breathing discomfort to most people on prolonged outdoor exposure.',
  },
  {
    name: 'Very Poor',
    rangeLabel: '301–400',
    minAqi: 301,
    maxAqi: 400,
    textColorClass: 'text-[#991B1B]',
    surfaceClass: 'bg-[#FEF2F2]',
    borderClass: 'border-[#FECACA]',
    barColorHex: '#B91C1C',
    healthImpact: 'Respiratory illness risk on prolonged exposure; limit outdoor exertion.',
  },
  {
    name: 'Severe',
    rangeLabel: '401–500',
    minAqi: 401,
    maxAqi: 500,
    textColorClass: 'text-[#701A75]',
    surfaceClass: 'bg-[#FDF4FF]',
    borderClass: 'border-[#F5D0FE]',
    barColorHex: '#86198F',
    healthImpact: 'Affects healthy people and seriously impacts those with existing conditions.',
  },
] as const;

export const CPCB_BREAKPOINTS: Record<PollutantKey, readonly BreakpointRow[]> = {
  pm2_5: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 250, cHigh: 380, iLow: 401, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 430, cHigh: 510, iLow: 401, iHigh: 500 },
  ],
  nitrogen_dioxide: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 40, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 80, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 180, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 280, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 400, cHigh: 520, iLow: 401, iHigh: 500 },
  ],
  ozone: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 100, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 168, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 208, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 748, cHigh: 1000, iLow: 401, iHigh: 500 },
  ],
  sulphur_dioxide: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 40, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 80, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 380, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 800, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1600, cHigh: 2100, iLow: 401, iHigh: 500 },
  ],
};

interface PollutantMeta {
  key: PollutantKey;
  label: string;
  symbol: string;
  unit: string;
  whoGuideline: number;
}

export const POLLUTANT_METADATA: readonly PollutantMeta[] = [
  { key: 'pm2_5', label: 'Fine Particulate Matter', symbol: 'PM2.5', unit: 'µg/m³', whoGuideline: 15 },
  { key: 'pm10', label: 'Coarse Particulate Matter', symbol: 'PM10', unit: 'µg/m³', whoGuideline: 45 },
  { key: 'nitrogen_dioxide', label: 'Nitrogen Dioxide', symbol: 'NO₂', unit: 'µg/m³', whoGuideline: 25 },
  { key: 'ozone', label: 'Ground-Level Ozone', symbol: 'O₃', unit: 'µg/m³', whoGuideline: 100 },
  { key: 'sulphur_dioxide', label: 'Sulphur Dioxide', symbol: 'SO₂', unit: 'µg/m³', whoGuideline: 40 },
] as const;

export function calculatePollutantSubIndex(
  pollutant: PollutantKey,
  concentration: number | null,
): number | null {
  if (concentration === null || !Number.isFinite(concentration) || concentration < 0) {
    return null;
  }

  const table = CPCB_BREAKPOINTS[pollutant];
  if (concentration === 0) {
    return 0;
  }

  const lastBand = table[table.length - 1];
  if (concentration >= lastBand.cHigh) {
    return 500;
  }

  const band = table.find((row) => concentration <= row.cHigh) ?? lastBand;
  const span = band.cHigh - band.cLow;
  if (span <= 0) {
    return band.iHigh;
  }

  const interpolated = ((band.iHigh - band.iLow) / span) * (concentration - band.cLow) + band.iLow;
  return Math.max(0, Math.min(500, Math.round(interpolated)));
}

export function getCpcbCategory(aqi: number): CpcbCategoryMeta {
  const clamped = Math.max(0, Math.min(500, Math.round(aqi)));
  const found = CPCB_CATEGORIES.find((cat) => clamped >= cat.minAqi && clamped <= cat.maxAqi);
  return found ?? CPCB_CATEGORIES[CPCB_CATEGORIES.length - 1];
}

export function getCpcbCategoryName(aqi: number): CpcbCategoryName {
  return getCpcbCategory(aqi).name;
}

export function computeCpcbAqi(readings: RawPollutantReadings): CpcbAqiResult {
  const subIndices: PollutantSubIndex[] = POLLUTANT_METADATA.map((meta) => {
    const rawVal = readings[meta.key];
    const subIndex = calculatePollutantSubIndex(meta.key, rawVal);
    const whoRatio =
      rawVal !== null && Number.isFinite(rawVal)
        ? Number((rawVal / meta.whoGuideline).toFixed(1))
        : null;

    return {
      key: meta.key,
      label: meta.label,
      symbol: meta.symbol,
      unit: meta.unit,
      concentration: rawVal !== null && Number.isFinite(rawVal) ? Number(rawVal.toFixed(1)) : null,
      subIndex,
      whoGuideline: meta.whoGuideline,
      whoRatio,
    };
  });

  const valid = subIndices.filter((item): item is PollutantSubIndex & { subIndex: number } =>
    item.subIndex !== null,
  );

  let dominantPollutant: PollutantSubIndex | null = null;
  let maxAqi = 0;

  for (const item of valid) {
    if (item.subIndex >= maxAqi) {
      maxAqi = item.subIndex;
      dominantPollutant = item;
    }
  }

  return {
    aqi: maxAqi,
    category: getCpcbCategory(maxAqi),
    dominantPollutant,
    subIndices,
  };
}

export const CPCB_SCALE_TICKS: readonly number[] = [0, 50, 100, 200, 300, 400, 500] as const;

export interface CpcbScaleSegment {
  category: CpcbCategoryMeta;
  startPercent: number;
  widthPercent: number;
}

export function getAqiScalePercent(aqi: number): number {
  const clamped = Math.max(0, Math.min(500, aqi));
  return Number(((clamped / 500) * 100).toFixed(2));
}

export function getCpcbScaleSegments(): CpcbScaleSegment[] {
  return CPCB_CATEGORIES.map((category, idx) => {
    const prevUpper = idx === 0 ? 0 : CPCB_CATEGORIES[idx - 1].maxAqi;
    return {
      category,
      startPercent: Number(((prevUpper / 500) * 100).toFixed(2)),
      widthPercent: Number((((category.maxAqi - prevUpper) / 500) * 100).toFixed(2)),
    };
  });
}
