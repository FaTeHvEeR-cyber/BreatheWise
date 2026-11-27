import { useState } from 'react';
import { Check } from 'lucide-react';
import type {
  AppliedShockPatch,
  CpcbAqiResult,
  LiveAirQualityData,
  SmogShockResponse,
  SmogShockStrategy,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import { SMOG_SHOCK_PRESETS } from '../data/breatheWisePresets';
import { isShockStrategyApplied } from '../utils/indoorQuestions';

interface SmogShockSimulatorSectionProps {
  liveData: LiveAirQualityData;
  cpcb: CpcbAqiResult;
  shockSlot: AsyncSlot<SmogShockResponse>;
  appliedShockPatches: readonly AppliedShockPatch[];
  onRunSmogShock: (scenario: string) => void;
  onApplyShockStrategy: (strategy: SmogShockStrategy) => void;
}

export function SmogShockSimulatorSection({
  liveData,
  cpcb,
  shockSlot,
  appliedShockPatches,
  onRunSmogShock,
  onApplyShockStrategy,
}: SmogShockSimulatorSectionProps) {
  const [customScenario, setCustomScenario] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('');

  const activeScenario = selectedScenario || shockSlot.data?.shockScenario || '';

  const handleRunShock = (scenario: string) => {
    const trimmed = scenario.trim();
    if (!trimmed) return;
    setSelectedScenario(trimmed);
    onRunSmogShock(trimmed);
  };

  return (
    <section aria-label="What-If sudden smog spike simulator" className="border border-slate-200 bg-white p-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-semibold text-slate-900">
          &ldquo;What-If&rdquo; Sudden Smog Spike Simulator
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Stress-test your {liveData.location.name} plan (current CPCB AQI {cpcb.aqi}) against sudden air-quality shocks and patch your active routine in one click.
        </p>
      </div>

      {appliedShockPatches.length > 0 && (
        <div
          role="status"
          aria-label="Currently applied routine patches"
          className="mt-4 border border-teal-200 bg-teal-50/70 px-4 py-3 text-xs text-teal-950"
        >
          <p className="font-semibold text-teal-900">Applied to Active Routine:</p>
          <ul className="mt-1 space-y-1">
            {appliedShockPatches.map((patch) => (
              <li key={`${patch.targetTimeBlock}-${patch.title}`} className="flex flex-wrap items-baseline gap-1.5">
                <span className="font-mono text-[11px] font-semibold uppercase text-teal-900">
                  {patch.targetTimeBlock}:
                </span>
                <span className="font-medium text-slate-900">{patch.title}</span>
                <span className="text-slate-600">({patch.scenario})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {SMOG_SHOCK_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={shockSlot.loading}
            onClick={() => handleRunShock(preset)}
            className={`rounded-md border px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
              activeScenario === preset
                ? 'border-teal-800 bg-teal-800 text-white'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          handleRunShock(customScenario);
        }}
      >
        <label htmlFor="custom-smog-shock" className="sr-only">
          Custom smog shock scenario
        </label>
        <input
          id="custom-smog-shock"
          type="text"
          value={customScenario}
          onChange={(e) => setCustomScenario(e.target.value)}
          placeholder="Or enter a custom shock (e.g., School bus cancelled during 380 AQI fog)…"
          className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={shockSlot.loading || !customScenario.trim()}
          className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-teal-900 disabled:opacity-60"
        >
          {shockSlot.loading ? 'Simulating…' : 'Simulate Shock'}
        </button>
      </form>

      {shockSlot.error && (
        <p role="status" className="mt-4 border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          Gemini live note ({shockSlot.error}) — showing deterministic emergency fallback strategies.
        </p>
      )}

      {shockSlot.data && (
        <div className="mt-5 space-y-4">
          <div className="border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div><strong className="font-semibold text-slate-900">Scenario:</strong> {shockSlot.data.shockScenario}</div>
              {shockSlot.data.source && (
                <span className="font-mono text-[11px] text-slate-600">Source: {shockSlot.data.source}</span>
              )}
            </div>
            <p className="mt-1 leading-relaxed">{shockSlot.data.severityAssessment}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {shockSlot.data.strategies.map((strategy) => {
              const applied = isShockStrategyApplied(
                appliedShockPatches,
                shockSlot.data?.shockScenario ?? activeScenario,
                strategy,
              );
              return (
                <article
                  key={strategy.id}
                  className={`flex flex-col justify-between border p-4 ${
                    applied ? 'border-teal-700 bg-teal-50/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-teal-900 uppercase">
                        Patches {strategy.targetTimeBlock}
                      </span>
                      {applied && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800">
                          <Check aria-hidden="true" className="h-3 w-3" />
                          Applied
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{strategy.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-800">{strategy.immediateAction}</p>
                    <p className="border-t border-slate-100 pt-2 text-xs text-slate-600">
                      <strong className="font-medium text-slate-900">Impact:</strong> {strategy.healthAndEmissionImpact}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={applied}
                    aria-pressed={applied}
                    onClick={() => onApplyShockStrategy(strategy)}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                      applied
                        ? 'cursor-default border-emerald-700 bg-emerald-700 text-white'
                        : 'border-teal-800 bg-white text-teal-900 hover:bg-teal-800 hover:text-white'
                    }`}
                  >
                    {applied ? (
                      <>
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        Applied to Active Routine
                      </>
                    ) : (
                      'Apply to Active Routine →'
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
