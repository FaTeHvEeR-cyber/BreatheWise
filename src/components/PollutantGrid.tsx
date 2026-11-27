import type { CpcbAqiResult } from '../types';

interface PollutantGridProps {
  cpcb: CpcbAqiResult;
  usAqi: number | null;
}

export function PollutantGrid({ cpcb, usAqi }: PollutantGridProps) {
  return (
    <div className="p-6 lg:col-span-7">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          Live Pollutant Concentrations & CPCB Sub-Indices
        </h2>
        <span className="font-mono text-xs text-slate-600">WHO 24h Guideline Ratio</span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-b border-slate-200 sm:grid-cols-2 sm:divide-y-0">
        {cpcb.subIndices.map((item, idx) => {
          const isDominant = cpcb.dominantPollutant?.key === item.key;
          return (
            <div
              key={item.key}
              className={`flex items-baseline justify-between gap-3 py-3.5 sm:px-3 ${
                idx >= 2 ? 'sm:border-t sm:border-slate-200' : ''
              } ${idx % 2 === 1 ? 'sm:border-l sm:border-slate-200' : ''}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-900">
                    {item.symbol}
                  </span>
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                  Sub-Index: {item.subIndex ?? '—'}
                  {isDominant ? ' · Dominant' : ''}
                </p>
              </div>
              <div className="text-right font-mono tabular-nums">
                <span className="text-lg font-semibold text-slate-900">
                  {item.concentration !== null ? item.concentration.toFixed(1) : '—'}
                </span>
                <span className="ml-1 text-xs text-slate-600">{item.unit}</span>
                <p className="text-xs text-slate-600">
                  {item.whoRatio !== null ? `${item.whoRatio.toFixed(1)}× WHO` : 'No reading'}
                </p>
              </div>
            </div>
          );
        })}

        <div className="flex items-baseline justify-between gap-3 py-3.5 sm:border-t sm:border-l sm:border-slate-200 sm:px-3">
          <div>
            <span className="font-mono text-sm font-semibold text-slate-900">US AQI</span>
            <p className="mt-1 text-xs text-slate-600">Open-Meteo US EPA reference</p>
          </div>
          <div className="text-right font-mono tabular-nums">
            <span className="text-lg font-semibold text-slate-900">
              {usAqi !== null ? Math.round(usAqi) : '—'}
            </span>
            <p className="text-xs text-slate-600">0–500 scale</p>
          </div>
        </div>
      </div>
    </div>
  );
}
