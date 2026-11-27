import type { HourlyForecastPoint } from '../types';
import { PM25_CPCB_MODERATE_LIMIT, PM25_SAFE_VENTILATION_LIMIT } from '../config/constants';
import { getCpcbCategoryName } from './cpcbAqi';
import { classifyVentilationHour } from './ventilationWindows';
import type { WindowVerdict } from './ventilationWindows';

export { PM25_CPCB_MODERATE_LIMIT, PM25_SAFE_VENTILATION_LIMIT };

export type TrajectoryDirection = 'Improving' | 'Worsening' | 'Elevated & Steady' | 'Low & Steady';

export interface Pm25ChartDatum {
  hourLabel: string;
  isoTime: string;
  pm2_5: number;
  cpcbSubIndex: number;
  cpcbCategory: string;
  ventilationVerdict: WindowVerdict;
}

export interface AirQualityTrajectory {
  direction: TrajectoryDirection;
  deltaUgM3: number;
  deltaPercent: number;
  minPm25: number;
  minHourLabel: string;
  maxPm25: number;
  maxHourLabel: string;
  avgPm25: number;
  summaryText: string;
  toneClass: string;
}

/** Maps 24-hour Open-Meteo points into Recharts series data with CPCB verdicts. */
export function buildPm25ChartData(hourly24h: readonly HourlyForecastPoint[]): Pm25ChartDatum[] {
  return hourly24h.map((pt) => {
    const pm2_5 = Number(pt.pm2_5.toFixed(1));
    return {
      hourLabel: pt.hourLabel,
      isoTime: pt.isoTime,
      pm2_5,
      cpcbSubIndex: pt.cpcbPm25SubIndex,
      cpcbCategory: getCpcbCategoryName(pt.cpcbPm25SubIndex),
      ventilationVerdict: classifyVentilationHour(pm2_5),
    };
  });
}

/** Summarizes 24-hour PM2.5 trajectory direction, min/max hours, and delta. */
export function computeAirQualityTrajectory(
  hourly24h: readonly HourlyForecastPoint[],
): AirQualityTrajectory {
  if (hourly24h.length === 0) {
    return {
      direction: 'Low & Steady',
      deltaUgM3: 0,
      deltaPercent: 0,
      minPm25: 0,
      minHourLabel: '—',
      maxPm25: 0,
      maxHourLabel: '—',
      avgPm25: 0,
      summaryText: 'No 24-hour PM2.5 forecast available.',
      toneClass: 'text-slate-700',
    };
  }

  let minPt = hourly24h[0];
  let maxPt = hourly24h[0];
  let sum = 0;
  for (const pt of hourly24h) {
    sum += pt.pm2_5;
    if (pt.pm2_5 < minPt.pm2_5) minPt = pt;
    if (pt.pm2_5 > maxPt.pm2_5) maxPt = pt;
  }

  const avgPm25 = Number((sum / hourly24h.length).toFixed(1));
  const span = Math.max(1, Math.min(6, Math.floor(hourly24h.length / 3)));
  const earlyAvg = hourly24h.slice(0, span).reduce((s, p) => s + p.pm2_5, 0) / span;
  const lateAvg = hourly24h.slice(-span).reduce((s, p) => s + p.pm2_5, 0) / span;
  const deltaUgM3 = Number((lateAvg - earlyAvg).toFixed(1));
  const deltaPercent = earlyAvg > 0 ? Math.round(((lateAvg - earlyAvg) / earlyAvg) * 100) : 0;

  let direction: TrajectoryDirection = 'Low & Steady';
  let toneClass = 'text-teal-800';
  let summaryText = `Clean dispersion near ${avgPm25.toFixed(1)} µg/m³ avg; cleanest period near ${minPt.hourLabel}.`;

  if (deltaUgM3 <= -5 && deltaPercent <= -10 && maxPt.pm2_5 > 30) {
    direction = 'Improving';
    toneClass = 'text-emerald-800';
    summaryText = `Trending down by ${Math.abs(deltaUgM3).toFixed(1)} µg/m³ (${Math.abs(deltaPercent)}%) toward the final 6 hours; trough at ${minPt.hourLabel}.`;
  } else if (deltaUgM3 >= 5 && deltaPercent >= 10 && maxPt.pm2_5 > 30) {
    direction = 'Worsening';
    toneClass = 'text-rose-800';
    summaryText = `Projected to climb +${deltaUgM3.toFixed(1)} µg/m³ (+${deltaPercent}%) over 24h; peak expected around ${maxPt.hourLabel}.`;
  } else if (avgPm25 > PM25_CPCB_MODERATE_LIMIT) {
    direction = 'Elevated & Steady';
    toneClass = 'text-amber-800';
    summaryText = `Persistently elevated near ${avgPm25.toFixed(1)} µg/m³ avg; narrowest dip at ${minPt.hourLabel} (${minPt.pm2_5.toFixed(1)} µg/m³).`;
  }

  return {
    direction,
    deltaUgM3,
    deltaPercent,
    minPm25: Number(minPt.pm2_5.toFixed(1)),
    minHourLabel: minPt.hourLabel,
    maxPm25: Number(maxPt.pm2_5.toFixed(1)),
    maxHourLabel: maxPt.hourLabel,
    avgPm25,
    summaryText,
    toneClass,
  };
}
