import type { HourlyForecastPoint } from '../types';
import { PM25_BRIEF_PURGE_LIMIT, PM25_SAFE_VENTILATION_LIMIT } from '../config/constants';

export type WindowVerdict = 'Open Windows' | 'Brief Purge' | 'Keep Sealed';

export interface HourlyVentilationStatus {
  isoTime: string;
  hourLabel: string;
  pm2_5: number;
  cpcbSubIndex: number;
  verdict: WindowVerdict;
}

export interface TimeWindowBand {
  startHourLabel: string;
  endHourLabel: string;
  startIndex: number;
  endIndex: number;
  avgPm25: number;
  peakPm25: number;
  minPm25: number;
  verdict: WindowVerdict;
}

export interface VentilationAnalysis {
  hourlyStatuses: HourlyVentilationStatus[];
  bestWindow: TimeWindowBand | null;
  worstWindow: TimeWindowBand | null;
  safeHourCount: number;
  sealedHourCount: number;
  dailyMinPm25: number;
  dailyMaxPm25: number;
  dailyAvgPm25: number;
  recommendedPurifierHours: number;
}

/** Classifies an hourly PM2.5 concentration into a window ventilation verdict. */
export function classifyVentilationHour(pm25: number): WindowVerdict {
  if (pm25 <= PM25_SAFE_VENTILATION_LIMIT) return 'Open Windows';
  if (pm25 <= PM25_BRIEF_PURGE_LIMIT) return 'Brief Purge';
  return 'Keep Sealed';
}

function buildSlidingWindow(
  points: readonly HourlyForecastPoint[],
  startIndex: number,
  windowSize: number,
): TimeWindowBand {
  const slice = points.slice(startIndex, startIndex + windowSize);
  const sum = slice.reduce((acc, p) => acc + p.pm2_5, 0);
  const avgPm25 = Number((sum / slice.length).toFixed(1));
  const peakPm25 = Number(Math.max(...slice.map((p) => p.pm2_5)).toFixed(1));
  const minPm25 = Number(Math.min(...slice.map((p) => p.pm2_5)).toFixed(1));

  return {
    startHourLabel: slice[0].hourLabel,
    endHourLabel: slice[slice.length - 1].hourLabel,
    startIndex,
    endIndex: startIndex + slice.length - 1,
    avgPm25,
    peakPm25,
    minPm25,
    verdict: classifyVentilationHour(avgPm25),
  };
}

/** Analyzes 24-hour PM2.5 forecasts to find cleanest and peak-danger 3-hour windows. */
export function analyzeVentilationWindows(
  hourly24h: readonly HourlyForecastPoint[],
  currentPm25: number,
  windowHours = 3,
): VentilationAnalysis {
  const hourlyStatuses: HourlyVentilationStatus[] = hourly24h.map((pt) => ({
    isoTime: pt.isoTime,
    hourLabel: pt.hourLabel,
    pm2_5: Number(pt.pm2_5.toFixed(1)),
    cpcbSubIndex: pt.cpcbPm25SubIndex,
    verdict: classifyVentilationHour(pt.pm2_5),
  }));

  if (hourly24h.length === 0) {
    return {
      hourlyStatuses: [],
      bestWindow: null,
      worstWindow: null,
      safeHourCount: 0,
      sealedHourCount: 0,
      dailyMinPm25: currentPm25,
      dailyMaxPm25: currentPm25,
      dailyAvgPm25: currentPm25,
      recommendedPurifierHours: currentPm25 > PM25_SAFE_VENTILATION_LIMIT ? 24 : 0,
    };
  }

  const effectiveSize = Math.min(windowHours, hourly24h.length);
  let bestWindow: TimeWindowBand | null = null;
  let worstWindow: TimeWindowBand | null = null;

  for (let i = 0; i <= hourly24h.length - effectiveSize; i += 1) {
    const candidate = buildSlidingWindow(hourly24h, i, effectiveSize);
    if (!bestWindow || candidate.avgPm25 < bestWindow.avgPm25) {
      bestWindow = candidate;
    }
    if (!worstWindow || candidate.avgPm25 > worstWindow.avgPm25) {
      worstWindow = candidate;
    }
  }

  const values = hourly24h.map((p) => p.pm2_5);
  const dailyMinPm25 = Number(Math.min(...values).toFixed(1));
  const dailyMaxPm25 = Number(Math.max(...values).toFixed(1));
  const dailyAvgPm25 = Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1));

  return {
    hourlyStatuses,
    bestWindow,
    worstWindow,
    safeHourCount: hourlyStatuses.filter((h) => h.verdict === 'Open Windows').length,
    sealedHourCount: hourlyStatuses.filter((h) => h.verdict === 'Keep Sealed').length,
    dailyMinPm25,
    dailyMaxPm25,
    dailyAvgPm25,
    recommendedPurifierHours: hourlyStatuses.filter((h) => h.pm2_5 > PM25_SAFE_VENTILATION_LIMIT)
      .length,
  };
}
