import { type ReactElement, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { CpcbAqiResult, LiveAirQualityData } from '../types';
import { CPCB_BREAKPOINTS, CPCB_CATEGORIES } from '../utils/cpcbAqi';
import { formatReadingDateTime, formatRefreshDateTime } from '../utils/timeFormatting';

interface MethodologyDialogProps {
  readonly open: boolean;
  readonly liveData: LiveAirQualityData | null;
  readonly cpcb: CpcbAqiResult | null;
  readonly onClose: () => void;
}

/** Modal dialog detailing CPCB National AQI breakpoints and live pollutant audit data. */
export function MethodologyDialog({
  open,
  liveData,
  cpcb,
  onClose,
}: MethodologyDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const reading = liveData ? formatReadingDateTime(liveData.readingIsoTime) : null;
  const refreshed = liveData
    ? formatRefreshDateTime(liveData.fetchedAtIso, liveData.location.timezone)
    : null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      aria-labelledby="methodology-dialog-title"
      className="m-auto max-h-[88vh] w-[min(94vw,46rem)] overflow-hidden border border-slate-300 bg-white p-0 text-slate-900 shadow-lg"
    >
      <div className="flex max-h-[88vh] flex-col overflow-hidden">
        <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 id="methodology-dialog-title" className="text-lg font-semibold text-slate-900">
              Indian CPCB National AQI Formula & Live Data Audit
            </h2>
            <p className="text-xs text-slate-600">
              Deterministic sub-index calculation grounded strictly in live Open-Meteo telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CPCB methodology dialog"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 text-sm text-slate-700">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Linear Sub-Index Interpolation (Zero AI Estimation)
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Each measured pollutant is converted into a 0–500 CPCB sub-index using its official
                concentration band:
              </p>
            </div>

            <div
              aria-label="CPCB linear sub-index interpolation formula"
              className="border border-slate-200 bg-slate-50 px-5 py-4"
            >
              <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 font-mono text-sm text-slate-900">
                <span className="font-semibold text-teal-900">
                  I<sub>p</sub>
                </span>
                <span aria-hidden="true">=</span>
                <span className="inline-flex flex-col items-center leading-tight">
                  <span className="border-b border-slate-800 px-2 pb-1">
                    I<sub>high</sub> &minus; I<sub>low</sub>
                  </span>
                  <span className="px-2 pt-1">
                    B<sub>high</sub> &minus; B<sub>low</sub>
                  </span>
                </span>
                <span aria-hidden="true">&times;</span>
                <span>
                  ( C<sub>p</sub> &minus; B<sub>low</sub> )
                </span>
                <span aria-hidden="true">+</span>
                <span>
                  I<sub>low</sub>
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-slate-200 pt-3 text-xs sm:grid-cols-2">
                <div className="flex items-baseline gap-2">
                  <dt className="shrink-0 font-mono font-semibold text-teal-900">
                    I<sub>p</sub>
                  </dt>
                  <dd className="text-slate-700">Pollutant AQI sub-index (0–500)</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="shrink-0 font-mono font-semibold text-slate-900">
                    C<sub>p</sub>
                  </dt>
                  <dd className="text-slate-700">Live measured concentration (µg/m³)</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="shrink-0 font-mono font-semibold text-slate-900">
                    B<sub>low</sub>, B<sub>high</sub>
                  </dt>
                  <dd className="text-slate-700">Lower &amp; upper concentration band limits</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="shrink-0 font-mono font-semibold text-slate-900">
                    I<sub>low</sub>, I<sub>high</sub>
                  </dt>
                  <dd className="text-slate-700">Matching AQI range bounds for that band</dd>
                </div>
              </dl>
            </div>

            <p className="text-xs leading-relaxed text-slate-700">
              The overall{' '}
              <strong className="font-semibold text-slate-900">Indian CPCB National AQI</strong>{' '}
              equals the highest{' '}
              <span className="font-mono font-semibold text-slate-900">
                I<sub>p</sub>
              </span>{' '}
              across PM2.5, PM10, NO₂, O₃, and SO₂, and that highest-scoring pollutant is reported
              as dominant.
            </p>
          </div>

          {liveData && cpcb && reading && refreshed && (
            <div className="border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Live Payload Audit (Auto-Refreshes Every 5 Min)
              </h3>
              <dl className="mt-2 grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-slate-600">Data Provider</dt>
                  <dd className="text-slate-900">{liveData.sourceName}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Reading Date & Time</dt>
                  <dd className="text-slate-900 tabular-nums">
                    {reading.dateLabel} &nbsp; {reading.timeLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Computed CPCB AQI</dt>
                  <dd className="text-slate-900 tabular-nums">
                    {cpcb.aqi} ({cpcb.category.name}) · US EPA AQI: {liveData.current.us_aqi ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Last Refreshed</dt>
                  <dd className="text-slate-900 tabular-nums">
                    {refreshed.dateLabel} &nbsp; {refreshed.timeLabel}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Official CPCB Breakpoint Table (µg/m³)
            </h3>
            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Category</th>
                    <th className="px-3 py-2 font-semibold">AQI Range</th>
                    <th className="px-3 py-2 text-right font-semibold">PM2.5</th>
                    <th className="px-3 py-2 text-right font-semibold">PM10</th>
                    <th className="px-3 py-2 text-right font-semibold">NO₂</th>
                    <th className="px-3 py-2 text-right font-semibold">O₃</th>
                    <th className="px-3 py-2 text-right font-semibold">SO₂</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {CPCB_CATEGORIES.map((cat, idx) => (
                    <tr key={cat.name} className="hover:bg-slate-50">
                      <td className={`px-3 py-2 font-sans font-semibold ${cat.textColorClass}`}>
                        {cat.name}
                      </td>
                      <td className="px-3 py-2 text-slate-800">{cat.rangeLabel}</td>
                      <td className="px-3 py-2 text-right">
                        {CPCB_BREAKPOINTS.pm2_5[idx].cLow}–{CPCB_BREAKPOINTS.pm2_5[idx].cHigh}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {CPCB_BREAKPOINTS.pm10[idx].cLow}–{CPCB_BREAKPOINTS.pm10[idx].cHigh}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {CPCB_BREAKPOINTS.nitrogen_dioxide[idx].cLow}–
                        {CPCB_BREAKPOINTS.nitrogen_dioxide[idx].cHigh}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {CPCB_BREAKPOINTS.ozone[idx].cLow}–{CPCB_BREAKPOINTS.ozone[idx].cHigh}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {CPCB_BREAKPOINTS.sulphur_dioxide[idx].cLow}–
                        {CPCB_BREAKPOINTS.sulphur_dioxide[idx].cHigh}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
