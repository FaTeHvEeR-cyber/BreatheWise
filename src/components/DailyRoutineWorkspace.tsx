import type {
  CpcbAqiResult,
  DailyRoutineResponse,
  HouseholdProfile,
  LiveAirQualityData,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import type { VentilationAnalysis } from '../utils/ventilationWindows';
import { Pm25ForecastChart } from '../utils/dataVisualization';

interface DailyRoutineWorkspaceProps {
  liveData: LiveAirQualityData;
  cpcb: CpcbAqiResult;
  profile: HouseholdProfile;
  hasHouseholdProfile: boolean;
  ventilation: VentilationAnalysis;
  routineSlot: AsyncSlot<DailyRoutineResponse>;
  completedBlockIds: readonly string[];
  protectionScorePct: number;
  appliedShockNote: string | null;
  onToggleBlock: (blockId: string) => void;
  onGenerateRoutine: () => void;
}

export default function DailyRoutineWorkspace({
  liveData,
  cpcb,
  profile,
  hasHouseholdProfile,
  ventilation,
  routineSlot,
  completedBlockIds,
  protectionScorePct,
  appliedShockNote,
  onToggleBlock,
  onGenerateRoutine,
}: DailyRoutineWorkspaceProps) {
  return (
    <div id="panel-routine" role="tabpanel" aria-labelledby="tab-routine" className="space-y-6">
      <section aria-label="24-hour cleanest ventilation window and protection score" className="border border-slate-200 bg-white">
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Best Ventilation Window</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-teal-900 tabular-nums">
              {ventilation.bestWindow
                ? `${ventilation.bestWindow.startHourLabel} – ${ventilation.bestWindow.endHourLabel}`
                : 'N/A'}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
              Avg {ventilation.bestWindow?.avgPm25.toFixed(1) ?? '—'} µg/m³ · {ventilation.bestWindow?.verdict ?? '—'}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Peak Smog Danger Hours</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-rose-900 tabular-nums">
              {ventilation.worstWindow
                ? `${ventilation.worstWindow.startHourLabel} – ${ventilation.worstWindow.endHourLabel}`
                : 'N/A'}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
              Peak {ventilation.worstWindow?.peakPm25.toFixed(1) ?? '—'} µg/m³ PM2.5
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Safe Airing Hours (≤35 µg/m³)</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {ventilation.safeHourCount} / {ventilation.hourlyStatuses.length} h
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {ventilation.sealedHourCount} h require sealed windows
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium text-slate-600">Clean-Air Protection Score</p>
              <span className="font-mono text-lg font-bold text-teal-900 tabular-nums">
                {protectionScorePct}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={protectionScorePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Daily Clean-Air Protection Score"
              className="mt-3 h-2.5 w-full bg-slate-100"
            >
              <div
                style={{ width: `${protectionScorePct}%` }}
                className="h-full bg-teal-700 transition-all"
              />
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Check off time blocks below to track daily protection.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="24-hour outdoor PM2.5 trend chart" className="border border-slate-200 bg-white p-6">
        <Pm25ForecastChart hourly24h={liveData.hourly24h} bestWindow={ventilation.bestWindow} />
      </section>

      <section aria-label="Personalized low-emission daily routine" className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Personalized Time-Blocked Routine (Morning · Midday · Evening · Night)
            </h2>
            <p className="text-xs text-slate-600">
              {hasHouseholdProfile && profile.profileName.trim()
                ? `Tailored to ${profile.profileName} in ${liveData.location.name} (CPCB AQI ${cpcb.aqi} · ${cpcb.category.name}).`
                : `Live ${liveData.location.name} schedule (CPCB AQI ${cpcb.aqi} · ${cpcb.category.name}).`}
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerateRoutine}
            disabled={routineSlot.loading}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-teal-900 disabled:opacity-60"
          >
            {routineSlot.loading
              ? 'Generating Routine…'
              : routineSlot.data
                ? 'Regenerate Routine'
                : 'Generate Daily Routine'}
          </button>
        </div>

        {appliedShockNote && (
          <div role="status" className="mt-4 border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-medium text-teal-950">
            {appliedShockNote}
          </div>
        )}

        {routineSlot.error && (
          <p role="status" className="mt-4 border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            Gemini live note ({routineSlot.error}) — showing deterministic local routine grounded in live Open-Meteo data.
          </p>
        )}

        {!routineSlot.data && !routineSlot.loading && (
          <p className="mt-4 text-sm text-slate-600">
            Click <strong className="font-medium text-slate-900">Generate Daily Routine</strong> (or answer clarifying questions in Intake) to build your 4-block low-emission schedule.
          </p>
        )}

        {routineSlot.data && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">{routineSlot.data.routineHeadline}</p>
              {routineSlot.data.source && (
                <span className="font-mono text-[11px] text-slate-600">Source: {routineSlot.data.source}</span>
              )}
            </div>
            <div className="divide-y divide-slate-200 border border-slate-200">
              {routineSlot.data.blocks.map((block) => {
                const checked = completedBlockIds.includes(block.id);
                return (
                  <label
                    key={block.id}
                    className={`flex cursor-pointer items-start gap-4 p-5 transition-colors ${
                      checked ? 'bg-teal-50/50' : 'bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleBlock(block.id)}
                      aria-label={`Mark ${block.timeBlock} routine complete: ${block.title}`}
                      className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs font-semibold text-teal-900 uppercase">
                            {block.timeBlock}
                          </span>
                          <span className="font-mono text-xs text-slate-500 tabular-nums">
                            {block.timeRange}
                          </span>
                          <span className={`text-base font-semibold ${checked ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {block.title}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-600 tabular-nums">
                          +{block.protectionWeight}% score
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-slate-800">
                        {block.recommendedAction}
                      </p>

                      <div className="border-t border-slate-100 pt-2 text-xs text-slate-700">
                        <strong className="font-semibold text-slate-900">Why This Matters:</strong>{' '}
                        {block.whyThisMatters}
                      </div>
                      <p className="font-mono text-xs text-slate-600">
                        Prep / Gear: {block.gearOrPrep}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-600">{routineSlot.data.dailySummaryNote}</p>
          </div>
        )}
      </section>
    </div>
  );
}
