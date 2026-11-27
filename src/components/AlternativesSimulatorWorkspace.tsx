import type {
  AppliedShockPatch,
  CpcbAqiResult,
  HouseholdProfile,
  LiveAirQualityData,
  SmogShockResponse,
  SmogShockStrategy,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import type { HabitSwapTotals } from '../utils/emissionsCalculator';
import { SmogShockSimulatorSection } from './SmogShockSimulatorSection';

interface AlternativesSimulatorWorkspaceProps {
  liveData: LiveAirQualityData;
  cpcb: CpcbAqiResult;
  profile: HouseholdProfile;
  selectedSwapIds: readonly string[];
  swapTotals: HabitSwapTotals;
  shockSlot: AsyncSlot<SmogShockResponse>;
  appliedShockPatches: readonly AppliedShockPatch[];
  onToggleSwap: (swapId: string) => void;
  onUpdateCommuteKm: (km: number) => void;
  onRunSmogShock: (scenario: string) => void;
  onApplyShockStrategy: (strategy: SmogShockStrategy) => void;
}

export default function AlternativesSimulatorWorkspace({
  liveData,
  cpcb,
  profile,
  selectedSwapIds,
  swapTotals,
  shockSlot,
  appliedShockPatches,
  onToggleSwap,
  onUpdateCommuteKm,
  onRunSmogShock,
  onApplyShockStrategy,
}: AlternativesSimulatorWorkspaceProps) {
  return (
    <div id="panel-simulator" role="tabpanel" aria-labelledby="tab-simulator" className="space-y-6">
      <section
        aria-label="Low-emission habit swap impact summary"
        className="border border-slate-200 bg-white"
      >
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Weekly CO₂ Avoided</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-teal-900 tabular-nums">
              {swapTotals.weeklyCo2KgAvoided.toFixed(1)} kg
            </p>
            <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
              ≈ {swapTotals.annualCo2KgAvoided} kg / year · {swapTotals.selectedCount} swaps active
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Personal PM2.5 Exposure Reduction</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              −{swapTotals.pm25ExposureReductionPct}%
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Combined diminishing-returns estimate at {liveData.current.pm2_5?.toFixed(1) ?? '—'}{' '}
              µg/m³ outdoor
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Estimated Monthly Savings</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              ₹{swapTotals.monthlyRupeesSaved.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Fuel, filter load &amp; household energy savings
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Low-emission habit swap engine"
        className="border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Low-Emission Habit Swap Engine
            </h2>
            <p className="text-xs text-slate-600">
              Toggle sustainable commute, errand, ventilation, and kitchen swaps to inspect exact
              CO₂, PM2.5, and rupee impacts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label
              htmlFor="swap-commute-km"
              className="text-xs font-medium text-slate-700 whitespace-nowrap"
            >
              Daily Commute:{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {profile.commuteDistanceKm} km
              </span>
            </label>
            <input
              id="swap-commute-km"
              type="range"
              min={2}
              max={60}
              step={2}
              value={profile.commuteDistanceKm}
              onChange={(e) => onUpdateCommuteKm(Number(e.target.value))}
              className="w-32 accent-teal-800"
            />
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-200 border border-slate-200">
          {swapTotals.rows.map((row) => {
            const active = selectedSwapIds.includes(row.swap.id);
            return (
              <label
                key={row.swap.id}
                className={`flex cursor-pointer flex-col gap-3 p-4 transition-colors md:flex-row md:items-center md:justify-between ${
                  active ? 'bg-teal-50/50' : 'bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggleSwap(row.swap.id)}
                    aria-label={`Enable habit swap: ${row.swap.sustainableSwap}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
                  />
                  <div>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700 uppercase">
                        {row.swap.category}
                      </span>
                      {' · '}Replace: {row.swap.currentHabit}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {row.swap.sustainableSwap}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{row.swap.mechanismNote}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 pl-7 font-mono text-xs tabular-nums md:pl-0">
                  <span className="text-teal-900 font-semibold">
                    −{row.weeklyCo2Kg.toFixed(1)} kg CO₂/wk
                  </span>
                  <span className="text-slate-800">−{row.pm25ReductionPct}% PM2.5</span>
                  <span className="text-slate-700">
                    ₹{row.monthlyRupeesSaved.toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <SmogShockSimulatorSection
        liveData={liveData}
        cpcb={cpcb}
        shockSlot={shockSlot}
        appliedShockPatches={appliedShockPatches}
        onRunSmogShock={onRunSmogShock}
        onApplyShockStrategy={onApplyShockStrategy}
      />
    </div>
  );
}
