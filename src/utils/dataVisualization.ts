import { createElement, useMemo } from 'react';
import type { ReactElement } from 'react';
import {
  Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { HourlyForecastPoint } from '../types';
import { getCpcbCategoryName } from './cpcbAqi';
import { classifyVentilationHour } from './ventilationWindows';
import type { TimeWindowBand, WindowVerdict } from './ventilationWindows';

export const PM25_SAFE_VENTILATION_LIMIT = 35;
export const PM25_CPCB_MODERATE_LIMIT = 60;

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

export interface Pm25ForecastChartProps {
  hourly24h: readonly HourlyForecastPoint[];
  bestWindow: TimeWindowBand | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Pm25ChartDatum }>;
}

const AXIS_TICK = { fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' };

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

function Pm25Tooltip({ active, payload }: CustomTooltipProps): ReactElement | null {
  const datum = active && payload && payload.length > 0 ? payload[0]?.payload : undefined;
  if (!datum) return null;

  return createElement(
    'div',
    { className: 'border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm' },
    createElement('p', { className: 'font-mono font-semibold tabular-nums' }, `${datum.hourLabel} · ${datum.pm2_5.toFixed(1)} µg/m³ PM2.5`),
    createElement('p', { className: 'mt-0.5 font-mono text-slate-700 tabular-nums' }, `CPCB Sub-Index ${datum.cpcbSubIndex} (${datum.cpcbCategory})`),
    createElement('p', { className: 'mt-0.5 font-medium text-teal-800' }, `Window Action: ${datum.ventilationVerdict}`),
  );
}

export function Pm25ForecastChart({ hourly24h, bestWindow }: Pm25ForecastChartProps): ReactElement {
  const chartData = useMemo(() => buildPm25ChartData(hourly24h), [hourly24h]);
  const traj = useMemo(() => computeAirQualityTrajectory(hourly24h), [hourly24h]);

  if (chartData.length === 0) {
    return createElement('div', { className: 'py-8 text-center text-sm text-slate-600' }, 'No 24-hour PM2.5 forecast series returned.');
  }

  const yUpper = Math.max(45, Math.ceil((traj.maxPm25 * 1.15) / 10) * 10);
  const areaChart = createElement(
    AreaChart,
    { data: chartData, margin: { top: 10, right: 16, left: -8, bottom: 4 } },
    createElement(
      'defs',
      null,
      createElement(
        'linearGradient',
        { id: 'pm25AreaGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
        createElement('stop', { offset: '5%', stopColor: '#0F766E', stopOpacity: 0.2 }),
        createElement('stop', { offset: '95%', stopColor: '#0F766E', stopOpacity: 0.02 }),
      ),
    ),
    createElement(CartesianGrid, { stroke: '#E2E8F0', strokeDasharray: '3 3', vertical: false }),
    bestWindow
      ? createElement(ReferenceArea, { x1: bestWindow.startHourLabel, x2: bestWindow.endHourLabel, fill: '#CCFBF1', fillOpacity: 0.65 })
      : null,
    createElement(XAxis, { dataKey: 'hourLabel', interval: 2, tick: AXIS_TICK, axisLine: { stroke: '#CBD5E1' }, tickLine: false }),
    createElement(YAxis, { domain: [0, yUpper], tick: AXIS_TICK, axisLine: false, tickLine: false, width: 44 }),
    createElement(ReferenceLine, {
      y: PM25_SAFE_VENTILATION_LIMIT,
      stroke: '#15803D',
      strokeDasharray: '4 4',
      label: { value: '35 µg/m³ Safe Airing', position: 'insideTopRight', fill: '#166534', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' },
    }),
    yUpper >= PM25_CPCB_MODERATE_LIMIT + 10
      ? createElement(ReferenceLine, {
          y: PM25_CPCB_MODERATE_LIMIT,
          stroke: '#B45309',
          strokeDasharray: '4 4',
          label: { value: '60 µg/m³ CPCB Moderate', position: 'insideTopRight', fill: '#92400E', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' },
        })
      : null,
    createElement(Tooltip, { content: createElement(Pm25Tooltip), cursor: { stroke: '#0F172A', strokeWidth: 1, strokeDasharray: '3 3' } }),
    createElement(Area, {
      type: 'monotone',
      dataKey: 'pm2_5',
      stroke: '#0F766E',
      strokeWidth: 2.25,
      fill: 'url(#pm25AreaGrad)',
      isAnimationActive: false,
      activeDot: { r: 4.5, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 },
    }),
  );

  return createElement(
    'div',
    {
      role: 'region',
      'aria-label': `24-hour PM2.5 forecast trend: ${traj.direction}, ${traj.minPm25} to ${traj.maxPm25} micrograms per cubic meter`,
    },
    createElement(
      'div',
      { className: 'mb-4 flex flex-wrap items-baseline justify-between gap-3' },
      createElement(
        'div',
        null,
        createElement(
          'div',
          { className: 'flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5' },
          createElement('h3', { className: 'text-base font-semibold text-slate-900' }, '24-Hour Outdoor PM2.5 Forecast Trajectory'),
          createElement('span', { 'aria-hidden': true, className: 'text-slate-400' }, '·'),
          createElement('span', { className: `text-sm font-semibold ${traj.toneClass}` }, traj.direction),
        ),
        createElement('p', { className: 'mt-0.5 text-xs text-slate-600' }, traj.summaryText),
      ),
      createElement(
        'div',
        { className: 'flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-700 tabular-nums' },
        createElement('span', null, `Low ${traj.minPm25.toFixed(1)} (${traj.minHourLabel})`),
        createElement('span', { 'aria-hidden': true, className: 'text-slate-400' }, '·'),
        createElement('span', null, `Avg ${traj.avgPm25.toFixed(1)}`),
        createElement('span', { 'aria-hidden': true, className: 'text-slate-400' }, '·'),
        createElement('span', null, `Peak ${traj.maxPm25.toFixed(1)} (${traj.maxHourLabel}) µg/m³`),
      ),
    ),
    createElement('div', { className: 'h-[240px] w-full' }, createElement(ResponsiveContainer, { width: '100%', height: '100%', children: areaChart })),
    createElement(
      'div',
      { className: 'mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600' },
      createElement(
        'span',
        null,
        bestWindow
          ? `Shaded teal band: safest 3-hour ventilation window (${bestWindow.startHourLabel} – ${bestWindow.endHourLabel}, avg ${bestWindow.avgPm25.toFixed(1)} µg/m³)`
          : 'Open-Meteo 24-hour outdoor PM2.5 projection',
      ),
      createElement('span', { className: 'font-mono text-[11px] tabular-nums' }, 'Units: µg/m³ · Hover points for CPCB sub-index'),
    ),
  );
}
