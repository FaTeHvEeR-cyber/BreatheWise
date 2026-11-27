import { useMemo } from 'react';
import type { ReactElement } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyForecastPoint } from '../types';
import { PM25_CPCB_MODERATE_LIMIT, PM25_SAFE_VENTILATION_LIMIT } from '../config/constants';
import {
  buildPm25ChartData,
  computeAirQualityTrajectory,
  type Pm25ChartDatum,
} from '../utils/dataVisualization';
import type { TimeWindowBand } from '../utils/ventilationWindows';

/** Synchronized properties for the 24-hour PM2.5 trend visualization chart. */
export interface Pm25ForecastChartProps {
  readonly hourly24h: readonly HourlyForecastPoint[];
  readonly bestWindow: TimeWindowBand | null;
}

interface CustomTooltipProps {
  readonly active?: boolean;
  readonly payload?: ReadonlyArray<{ readonly payload?: Pm25ChartDatum }>;
}

const AXIS_TICK = { fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' };

function Pm25Tooltip({ active, payload }: CustomTooltipProps): ReactElement | null {
  const datum = active && payload && payload.length > 0 ? payload[0]?.payload : undefined;
  if (!datum) return null;

  return (
    <div className="border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm">
      <p className="font-mono font-semibold tabular-nums">
        {datum.hourLabel} · {datum.pm2_5.toFixed(1)} µg/m³ PM2.5
      </p>
      <p className="mt-0.5 font-mono text-slate-700 tabular-nums">
        CPCB Sub-Index {datum.cpcbSubIndex} ({datum.cpcbCategory})
      </p>
      <p className="mt-0.5 font-medium text-teal-800">Window Action: {datum.ventilationVerdict}</p>
    </div>
  );
}

/** Renders the 24-hour outdoor PM2.5 forecast area chart with safest airing band. */
export function Pm25ForecastChart({ hourly24h, bestWindow }: Pm25ForecastChartProps): ReactElement {
  const chartData = useMemo(() => buildPm25ChartData(hourly24h), [hourly24h]);
  const traj = useMemo(() => computeAirQualityTrajectory(hourly24h), [hourly24h]);

  if (chartData.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-600">
        No 24-hour PM2.5 forecast series returned.
      </div>
    );
  }

  const yUpper = Math.max(45, Math.ceil((traj.maxPm25 * 1.15) / 10) * 10);

  return (
    <div
      role="region"
      aria-label={`24-hour PM2.5 forecast trend: ${traj.direction}, ${traj.minPm25} to ${traj.maxPm25} micrograms per cubic meter`}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h3 className="text-base font-semibold text-slate-900">
              24-Hour Outdoor PM2.5 Forecast Trajectory
            </h3>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className={`text-sm font-semibold ${traj.toneClass}`}>{traj.direction}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">{traj.summaryText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-700 tabular-nums">
          <span>
            Low {traj.minPm25.toFixed(1)} ({traj.minHourLabel})
          </span>
          <span aria-hidden="true" className="text-slate-400">
            ·
          </span>
          <span>Avg {traj.avgPm25.toFixed(1)}</span>
          <span aria-hidden="true" className="text-slate-400">
            ·
          </span>
          <span>
            Peak {traj.maxPm25.toFixed(1)} ({traj.maxHourLabel}) µg/m³
          </span>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 4 }}>
            <defs>
              <linearGradient id="pm25AreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F766E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0F766E" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            {bestWindow && (
              <ReferenceArea
                x1={bestWindow.startHourLabel}
                x2={bestWindow.endHourLabel}
                fill="#CCFBF1"
                fillOpacity={0.65}
              />
            )}
            <XAxis
              dataKey="hourLabel"
              interval={2}
              tick={AXIS_TICK}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, yUpper]}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <ReferenceLine
              y={PM25_SAFE_VENTILATION_LIMIT}
              stroke="#15803D"
              strokeDasharray="4 4"
              label={{
                value: '35 µg/m³ Safe Airing',
                position: 'insideTopRight',
                fill: '#166534',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            />
            {yUpper >= PM25_CPCB_MODERATE_LIMIT + 10 && (
              <ReferenceLine
                y={PM25_CPCB_MODERATE_LIMIT}
                stroke="#B45309"
                strokeDasharray="4 4"
                label={{
                  value: '60 µg/m³ CPCB Moderate',
                  position: 'insideTopRight',
                  fill: '#92400E',
                  fontSize: 10,
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              />
            )}
            <Tooltip
              content={<Pm25Tooltip />}
              cursor={{ stroke: '#0F172A', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="pm2_5"
              stroke="#0F766E"
              strokeWidth={2.25}
              fill="url(#pm25AreaGrad)"
              isAnimationActive={false}
              activeDot={{ r: 4.5, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          {bestWindow
            ? `Shaded teal band: safest 3-hour ventilation window (${bestWindow.startHourLabel} – ${bestWindow.endHourLabel}, avg ${bestWindow.avgPm25.toFixed(1)} µg/m³)`
            : 'Open-Meteo 24-hour outdoor PM2.5 projection'}
        </span>
        <span className="font-mono text-[11px] tabular-nums">
          Units: µg/m³ · Hover points for CPCB sub-index
        </span>
      </div>
    </div>
  );
}
