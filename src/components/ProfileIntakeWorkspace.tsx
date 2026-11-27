import { useId, useState } from 'react';
import { Search } from 'lucide-react';
import type {
  CityLocation,
  ClarifyingQuestionsResponse,
  CpcbAqiResult,
  EvaluatorSampleProfile,
  HouseholdProfile,
  LiveAirQualityData,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import { EVALUATOR_SAMPLE_PROFILES, QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';
import { useCitySearch } from '../hooks/useCitySearch';
import { PollutantGrid } from './PollutantGrid';
import { CpcbAqiMeter } from './CpcbAqiMeter';
import { CustomHouseholdSection } from './CustomHouseholdSection';
import { ClarifyingIntakeSection } from './ClarifyingIntakeSection';

interface ProfileIntakeWorkspaceProps {
  location: CityLocation;
  activePresetId: string | null;
  hasHouseholdProfile: boolean;
  liveData: LiveAirQualityData;
  cpcb: CpcbAqiResult;
  profile: HouseholdProfile;
  questionsSlot: AsyncSlot<ClarifyingQuestionsResponse>;
  loadingMoreQuestions: boolean;
  answers: Record<string, string>;
  additionalContext: string;
  routineLoading: boolean;
  onSelectCity: (city: CityLocation) => void;
  onSelectSampleProfile: (preset: EvaluatorSampleProfile) => void;
  onSyncSetup: (patch: Partial<HouseholdProfile>) => void;
  onSaveCustomProfile: (custom: HouseholdProfile) => void;
  onClearHousehold: () => void;
  onAskQuestions: () => void;
  onAskMoreQuestions: () => void;
  onSetAnswer: (questionId: string, value: string) => void;
  onChangeAdditionalContext: (value: string) => void;
  onGenerateAndGoToRoutine: () => void;
}

export default function ProfileIntakeWorkspace(props: ProfileIntakeWorkspaceProps) {
  const {
    location, activePresetId, hasHouseholdProfile, liveData, cpcb, profile,
    questionsSlot, loadingMoreQuestions, answers, additionalContext, routineLoading,
    onSelectCity, onSelectSampleProfile, onSyncSetup, onSaveCustomProfile, onClearHousehold,
    onAskQuestions, onAskMoreQuestions, onSetAnswer, onChangeAdditionalContext, onGenerateAndGoToRoutine,
  } = props;
  const { query, setQuery, results, searching, searchError, clearSearch } = useCitySearch();
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const inputId = useId();
  const listboxId = useId();

  return (
    <div id="panel-intake" role="tabpanel" aria-labelledby="tab-intake" className="space-y-6">
      <section aria-label="All-India city search and quick city chips" className="border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
          <div className="relative lg:col-span-5">
            <label htmlFor={inputId} className="sr-only">
              Search any Indian city via Open-Meteo Geocoding
            </label>
            <div className="relative flex items-center">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
              <input
                id={inputId}
                type="search"
                value={query}
                onFocus={() => setOpenDropdown(true)}
                onBlur={() => window.setTimeout(() => setOpenDropdown(false), 180)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenDropdown(true);
                }}
                placeholder="Search any Indian city (Gurugram, Jalandhar, Lucknow…)"
                role="combobox"
                aria-expanded={openDropdown && (results.length > 0 || searching)}
                aria-controls={listboxId}
                aria-autocomplete="list"
                className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>
            {openDropdown && (searching || results.length > 0 || searchError) && (
              <ul
                id={listboxId}
                role="listbox"
                aria-label="Geocoding city matches"
                className="absolute right-0 left-0 z-20 mt-1 max-h-60 overflow-auto border border-slate-200 bg-white py-1 shadow-sm"
              >
                {searching && <li className="px-3 py-2 text-xs text-slate-600">Searching Open-Meteo Geocoding…</li>}
                {searchError && <li className="px-3 py-2 text-xs text-red-700">{searchError}</li>}
                {!searching && results.map((city) => (
                  <li key={city.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelectCity(city);
                        clearSearch();
                        setOpenDropdown(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                    >
                      <span className="font-medium">{city.name}{city.admin1 ? `, ${city.admin1}` : ''}</span>
                      <span className="font-mono text-xs text-slate-600 tabular-nums">{city.country}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 lg:col-span-7" role="group" aria-label="Quick Indian city chips">
            <span className="mr-1 text-xs font-medium text-slate-600">Quick Cities:</span>
            {QUICK_INDIAN_CITIES.map((city) => {
              const selected = location.name === city.name;
              return (
                <button
                  key={city.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectCity(city)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    selected
                      ? 'border-teal-800 bg-teal-800 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {city.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-label="Live Indian CPCB National AQI readout" className="border border-slate-200 bg-white">
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
                  Active Household: <strong className="text-slate-900">{profile.personaSummary}</strong>
                </p>
              )}
            </div>
          </div>

          <PollutantGrid cpcb={cpcb} usAqi={liveData.current.us_aqi} />
        </div>
      </section>

      <section aria-label="1-click evaluator sample household profiles" className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Verified Sample Household Scenarios (Optional)</h2>
            <p className="text-xs text-slate-600">Select a sample Indian household template to preload its city & profile, or configure your own household below.</p>
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
                  active ? 'border-teal-800 bg-teal-50/70 text-slate-900' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="block text-sm font-semibold text-slate-900">{preset.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{preset.subtitle}</span>
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
