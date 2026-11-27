import type {
  CpcbAqiResult,
  CpcbCategoryMeta,
  CpcbCategoryName,
  PollutantKey,
  PollutantSubIndex,
  RawPollutantReadings,
} from '../types';
import { CPCB_AQI_MAX, CPCB_AQI_MIN } from '../config/constants';
import {
  CPCB_BREAKPOINTS,
  CPCB_CATEGORIES,
  CPCB_SCALE_TICKS,
  POLLUTANT_METADATA,
  type BreakpointRow,
} from './cpcbBreakpoints';

export { CPCB_BREAKPOINTS, CPCB_CATEGORIES, CPCB_SCALE_TICKS, POLLUTANT_METADATA };
export type { BreakpointRow };

/** Computes deterministic 0-500 Indian CPCB sub-index via linear breakpoint interpolation. */
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
    return CPCB_AQI_MAX;
  }

  const band = table.find((row) => concentration <= row.cHigh) ?? lastBand;
  const span = band.cHigh - band.cLow;
  if (span <= 0) {
    return band.iHigh;
  }

  const interpolated = ((band.iHigh - band.iLow) / span) * (concentration - band.cLow) + band.iLow;
  return Math.max(CPCB_AQI_MIN, Math.min(CPCB_AQI_MAX, Math.round(interpolated)));
}

/** Maps a 0-500 CPCB AQI value to its official category metadata. */
export function getCpcbCategory(aqi: number): CpcbCategoryMeta {
  const clamped = Math.max(CPCB_AQI_MIN, Math.min(CPCB_AQI_MAX, Math.round(aqi)));
  const found = CPCB_CATEGORIES.find((cat) => clamped >= cat.minAqi && clamped <= cat.maxAqi);
  return found ?? CPCB_CATEGORIES[CPCB_CATEGORIES.length - 1];
}

/** Returns the official CPCB category name for a given AQI value. */
export function getCpcbCategoryName(aqi: number): CpcbCategoryName {
  return getCpcbCategory(aqi).name;
}

/** Computes overall Indian CPCB National AQI, dominant pollutant, and WHO ratios. */
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

  const valid = subIndices.filter(
    (item): item is PollutantSubIndex & { subIndex: number } => item.subIndex !== null,
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

export interface CpcbScaleSegment {
  category: CpcbCategoryMeta;
  startPercent: number;
  widthPercent: number;
}

/** Maps a 0-500 AQI score to its percentage position along the linear scale. */
export function getAqiScalePercent(aqi: number): number {
  const clamped = Math.max(CPCB_AQI_MIN, Math.min(CPCB_AQI_MAX, aqi));
  return Number(((clamped / CPCB_AQI_MAX) * 100).toFixed(2));
}

/** Returns proportional width segments for all 6 CPCB AQI bands on the 0-500 scale. */
export function getCpcbScaleSegments(): CpcbScaleSegment[] {
  return CPCB_CATEGORIES.map((category, idx) => {
    const prevUpper = idx === 0 ? 0 : CPCB_CATEGORIES[idx - 1].maxAqi;
    return {
      category,
      startPercent: Number(((prevUpper / CPCB_AQI_MAX) * 100).toFixed(2)),
      widthPercent: Number((((category.maxAqi - prevUpper) / CPCB_AQI_MAX) * 100).toFixed(2)),
    };
  });
}
