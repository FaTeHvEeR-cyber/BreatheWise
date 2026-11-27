import type { IndoorMitigationMeter } from '../utils/emissionsCalculator';

interface IndoorReductionMeterProps {
  meter: IndoorMitigationMeter;
}

export function IndoorReductionMeter({ meter }: IndoorReductionMeterProps) {
  const maxBar = Math.max(meter.beforePm25, meter.outdoorPm25, 25);
  const beforePct = Math.min(100, Math.round((meter.beforePm25 / maxBar) * 100));
  const afterPct = Math.min(100, Math.round((meter.afterPm25 / maxBar) * 100));

  return (
    <div className="flex flex-col justify-between border border-slate-200 bg-white p-6 lg:col-span-5">
      <div>
        <p className="text-xs font-medium text-slate-600">
          Deterministic Before vs. After Indoor PM2.5 Meter
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="font-mono text-4xl font-semibold text-teal-900 tabular-nums">
            −{meter.reductionPercent}%
          </span>
          <span className="font-mono text-xs text-slate-600 tabular-nums">
            Outdoor: {meter.outdoorPm25} µg/m³
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-700">
              <span>Before Protocol (Unmitigated Flat)</span>
              <span className="font-mono font-semibold text-rose-900 tabular-nums">
                {meter.beforePm25} µg/m³
              </span>
            </div>
            <div className="mt-1.5 h-3 w-full bg-slate-100">
              <div style={{ width: `${beforePct}%` }} className="h-full bg-rose-700 transition-all" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-700">
              <span>After Protocol (Mitigated Indoor)</span>
              <span className="font-mono font-semibold text-teal-900 tabular-nums">
                {meter.afterPm25} µg/m³
              </span>
            </div>
            <div className="mt-1.5 h-3 w-full bg-slate-100">
              <div style={{ width: `${afterPct}%` }} className="h-full bg-teal-700 transition-all" />
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-1.5 border-t border-slate-200 pt-4 text-xs text-slate-700">
        {meter.appliedMeasures.map((measure) => (
          <li key={measure} className="flex items-start gap-2">
            <span aria-hidden="true" className="font-mono text-teal-800">•</span>
            <span>{measure}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
