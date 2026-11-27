import type { ReactElement } from 'react';
import type {
  ClarifyingQuestionsResponse,
  CpcbAqiResult,
  HouseholdProfile,
  LiveAirQualityData,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import { EVALUATOR_SAMPLE_PROFILES } from '../data/breatheWisePresets';
import { CitySearchSection } from './CitySearchSection';
import { PollutantGrid } from './PollutantGrid';
import { CpcbAqiMeter } from './CpcbAqiMeter';
import { CustomHouseholdSection } from './CustomHouseholdSection';
import { ClarifyingIntakeSection } from './ClarifyingIntakeSection';

interface ProfileIntakeWorkspaceProps {
  readonly location: CitySearchSectionProps['location'];
  readonly activePresetId: string | null;
  readonly hasHouseholdProfile: boolean;
  readonly liveData: LiveAirQualityData;
  readonly cpcb: CpcbAqiResult;
  readonly profile: HouseholdProfile;
  readonly questionsSlot: AsyncSlot<ClarifyingQuestionsResponse>;
  readonly loadingMoreQuestions: boolean;
  readonly answers: Readonly<Record<string, string>>;
  readonly additionalContext: string;
  readonly routineLoading: boolean;
  readonly onSelectCity: (city: CitySearchSectionProps['location']) => void;
  readonly onSelectSampleProfile: (preset: (typeof EVALUATOR_SAMPLE_PROFILES)[number]) => void;
  readonly onSyncSetup: (patch: Partial<HouseholdProfile>) => void;
  readonly onSaveCustomProfile: (custom: HouseholdProfile) => void;
  readonly onClearHousehold: () => void;
  readonly onAskQuestions: () => void;
  readonly onAskMoreQuestions: () => void;
  readonly onSetAnswer: (questionId: string, value: string) => void;
  readonly onChangeAdditionalContext: (value: string) => void;
  readonly onGenerateAndGoToRoutine: () => void;
}

type CitySearchSectionProps = Parameters<typeof CitySearchSection>[0];

/** Workspace 1: live city AQI telemetry, 1-click sample profiles, and intake. */
export default function ProfileIntakeWorkspace(props: ProfileIntakeWorkspaceProps): ReactElement {
  const {
    location,
    activePresetId,
    hasHouseholdProfile,
    liveData,
    cpcb,
    profile,
    questionsSlot,
    loadingMoreQuestions,
    answers,
    additionalContext,
    routineLoading,
    onSelectCity,
    onSelectSampleProfile,
    onSyncSetup,
    onSaveCustomProfile,
    onClearHousehold,
    onAskQuestions,
    onAskMoreQuestions,
    onSetAnswer,
    onChangeAdditionalContext,
    onGenerateAndGoToRoutine,
  } = props;

  return (
    <div id="panel-intake" role="tabpanel" aria-labelledby="tab-intake" className="space-y-6">
      <CitySearchSection location={location} onSelectCity={onSelectCity} />

      <section
        aria-label="Live Indian CPCB National AQI readout"
        className="border border-slate-200 bg-white"
      >
        <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          <div className="flex flex-col justify-between p-6 lg:col-span-5">
            <div>
              <p className="text-xs font-medium text-slate-600">
                Indian CPCB National AQI (Deterministic 0–500)
              </p>
              <div className="mt-3 flex items-baseline gap-4">
                <span className="font-mono text-6xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {cpcb.aqi}
                </span>
                <div>
                  <span className={`block text-xl font-bold ${cpcb.category.textColorClass}`}>
                    {cpcb.category.name}
                  </span>
                  <span className="font-mono text-xs text-slate-600 tabular-nums">
                    Band {cpcb.category.rangeLabel} · US EPA AQI {liveData.current.us_aqi ?? '—'}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {cpcb.category.healthImpact}
              </p>
            </div>

            <div>
              <CpcbAqiMeter cpcb={cpcb} />
              {hasHouseholdProfile && profile.personaSummary.trim() && (
                <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-700">
                  Active Household:{' '}
                  <strong className="text-slate-900">{profile.personaSummary}</strong>
                </p>
              )}
            </div>
          </div>

          <PollutantGrid cpcb={cpcb} usAqi={liveData.current.us_aqi} />
        </div>
      </section>

      <section
        aria-label="1-click evaluator sample household profiles"
        className="border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Verified Sample Household Scenarios (Optional)
            </h2>
            <p className="text-xs text-slate-600">
              Select a sample Indian household template to preload its city & profile, or configure
              your own household below.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-600">4 Verified Scenarios</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {EVALUATOR_SAMPLE_PROFILES.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectSampleProfile(preset)}
                className={`flex flex-col justify-between border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  active
                    ? 'border-teal-800 bg-teal-50/70 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="block text-sm font-semibold text-slate-900">{preset.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                    {preset.subtitle}
                  </span>
                </div>
                <span className="mt-3 block font-mono text-[11px] font-medium text-teal-800">
                  {active ? 'Selected Scenario' : `Use ${preset.city.name} Template →`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <CustomHouseholdSection
        profile={profile}
        hasHouseholdProfile={hasHouseholdProfile}
        onSyncSetup={onSyncSetup}
        onSaveCustomProfile={onSaveCustomProfile}
        onClearHousehold={onClearHousehold}
      />

      <ClarifyingIntakeSection
        cityName={liveData.location.name}
        cpcbAqi={cpcb.aqi}
        hasHouseholdProfile={hasHouseholdProfile}
        householdName={profile.profileName}
        questionsSlot={questionsSlot}
        loadingMoreQuestions={loadingMoreQuestions}
        answers={answers}
        additionalContext={additionalContext}
        routineLoading={routineLoading}
        onAskQuestions={onAskQuestions}
        onAskMoreQuestions={onAskMoreQuestions}
        onSetAnswer={onSetAnswer}
        onChangeAdditionalContext={onChangeAdditionalContext}
        onGenerateRoutine={onGenerateAndGoToRoutine}
      />
    </div>
  );
}
