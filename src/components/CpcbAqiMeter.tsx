import type { CpcbAqiResult } from '../types';
import {
  CPCB_SCALE_TICKS,
  getAqiScalePercent,
  getCpcbScaleSegments,
} from '../utils/cpcbAqi';

interface CpcbAqiMeterProps {
  cpcb: CpcbAqiResult;
}

const SEGMENTS = getCpcbScaleSegments();

export function CpcbAqiMeter({ cpcb }: CpcbAqiMeterProps) {
  const markerPercent = getAqiScalePercent(cpcb.aqi);
  // Keep floating readout tag inside horizontal bounds near 0 or 500 while the thumb stays exact.
  const calloutPercent = Math.max(7, Math.min(93, markerPercent));

  return (
    <div className="mt-6">
      <div className="relative h-7" aria-hidden="true">
        <div
          style={{ left: `${calloutPercent}%` }}
          className="absolute bottom-1 -translate-x-1/2 rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-white tabular-nums shadow-xs"
        >
          {cpcb.aqi}
        </div>
        <div
          style={{ left: `${markerPercent}%` }}
          className="absolute bottom-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-slate-900"
        />
      </div>

      <div
        role="meter"
        aria-label="Indian CPCB National AQI Linear Scale"
        aria-valuemin={0}
        aria-valuemax={500}
        aria-valuenow={cpcb.aqi}
        aria-valuetext={`AQI ${cpcb.aqi}, ${cpcb.category.name} (${cpcb.category.rangeLabel})`}
        className="relative flex h-3.5 w-full items-center"
      >
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
          {SEGMENTS.map((seg) => {
            const isActive = seg.category.name === cpcb.category.name;
            return (
              <div
                key={seg.category.name}
                style={{
                  width: `${seg.widthPercent}%`,
                  backgroundColor: seg.category.barColorHex,
                }}
                title={`${seg.category.name} (${seg.category.rangeLabel})`}
                className={`h-full border-r border-white/80 last:border-r-0 transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-80'
                }`}
              />
            );
          })}
        </div>

        <div
          aria-hidden="true"
          style={{ left: `${markerPercent}%` }}
          className="pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-slate-900 bg-white shadow-sm"
        >
          <span
            style={{ backgroundColor: cpcb.category.barColorHex }}
            className="h-1.5 w-1.5 rounded-full"
          />
        </div>
      </div>

      <div className="relative mt-1.5 h-5" aria-hidden="true">
        {CPCB_SCALE_TICKS.map((tick) => {
          const leftPct = getAqiScalePercent(tick);
          const alignClass =
            tick === 0
              ? 'items-start'
              : tick === 500
                ? 'items-end -translate-x-full'
                : 'items-center -translate-x-1/2';

          return (
            <div
              key={tick}
              style={{ left: `${leftPct}%` }}
              className={`absolute top-0 flex flex-col ${alignClass}`}
            >
              <span className="h-1.5 w-px bg-slate-300" />
              <span className="mt-0.5 font-mono text-[11px] leading-none text-slate-700 tabular-nums">
                {tick}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
        <span className="text-[#166534]">Good</span>
        <span className="text-[#701A75]">Severe</span>
      </div>
    </div>
  );
}
