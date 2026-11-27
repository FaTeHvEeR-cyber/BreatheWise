import type {
  ClarifyingQuestion, CookingFuel, CpcbAqiResult,
  HouseholdProfile, IndoorProtocolResponse, LiveAirQualityData,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import type { IndoorMitigationMeter } from '../utils/emissionsCalculator';
import { clampActiveRooms } from '../utils/numericInput';
import { IndoorReductionMeter } from './IndoorReductionMeter';
import { IndoorQuestionsPanel } from './IndoorQuestionsPanel';
import { InfoTooltip } from './InfoTooltip';

interface IndoorLabWorkspaceProps {
  liveData: LiveAirQualityData;
  cpcb: CpcbAqiResult;
  profile: HouseholdProfile;
  hasHouseholdProfile: boolean;
  indoorMeter: IndoorMitigationMeter;
  indoorSlot: AsyncSlot<IndoorProtocolResponse>;
  indoorQuestions: readonly ClarifyingQuestion[];
  indoorAnswers: Record<string, string>;
  loadingMoreIndoorQuestions: boolean;
  moreIndoorQuestionsError: string | null;
  onUpdateProfile: (patch: Partial<HouseholdProfile>) => void;
  onSetIndoorAnswer: (questionId: string, value: string) => void;
  onAskTwoMoreIndoorQuestions: () => void;
  onGenerateProtocol: () => void;
}

const FUEL_OPTIONS: ReadonlyArray<{ id: CookingFuel; label: string }> = [
  { id: 'lpg_gas', label: 'LPG Gas' }, { id: 'png_gas', label: 'PNG Gas' }, { id: 'induction', label: 'Induction' },
];

export default function IndoorLabWorkspace(props: IndoorLabWorkspaceProps) {
  const {
    liveData, cpcb, profile, hasHouseholdProfile, indoorMeter, indoorSlot,
    indoorQuestions, indoorAnswers, loadingMoreIndoorQuestions, moreIndoorQuestionsError,
    onUpdateProfile, onSetIndoorAnswer, onAskTwoMoreIndoorQuestions, onGenerateProtocol,
  } = props;
  const totalRooms = Math.max(1, profile.roomCount);
  const activeRooms = clampActiveRooms(profile.activeRoomCount, totalRooms);

  return (
    <div id="panel-indoor" role="tabpanel" aria-labelledby="tab-indoor" className="space-y-6">
      <section aria-label="Home setup and indoor PM2.5 reduction meter" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Home Air-Quality Setup &amp; Budget Mode
            </h2>
            <span className="font-mono text-[11px] font-medium text-teal-900">
              {hasHouseholdProfile && profile.profileName
                ? `Auto-filled from ${profile.profileName}`
                : 'Synced with Household Profile'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Options filled in your Household Profile are auto-filled below. Toggle any control to adapt the deterministic PM2.5 meter and Gemini room protocol immediately.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-700">Filtration Mode</p>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Air filtration mode">
                <button
                  type="button"
                  aria-pressed={profile.hasPurifier}
                  onClick={() => onUpdateProfile({ hasPurifier: true })}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    profile.hasPurifier
                      ? 'border-teal-800 bg-teal-800 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  HEPA Purifier
                </button>
                <button
                  type="button"
                  aria-pressed={!profile.hasPurifier}
                  onClick={() => onUpdateProfile({ hasPurifier: false })}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    !profile.hasPurifier
                      ? 'border-teal-800 bg-teal-800 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Budget DIY / Zero
                </button>
              </div>
            </div>

            <div className="border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-700">Primary Cooking Fuel</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Cooking fuel type">
                {FUEL_OPTIONS.map((fuel) => {
                  const selected = profile.cookingFuel === fuel.id;
                  return (
                    <button
                      key={fuel.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onUpdateProfile({ cookingFuel: fuel.id })}
                      className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-teal-800 bg-teal-800 text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {fuel.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between border border-slate-200 p-4">
              <span className="text-xs font-medium text-slate-800">Active Kitchen Chimney / Exhaust</span>
              <input
                type="checkbox"
                checked={profile.hasKitchenExhaust}
                onChange={(e) => onUpdateProfile({ hasKitchenExhaust: e.target.checked })}
                className="h-4 w-4 accent-teal-800"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between border border-slate-200 p-4">
              <span className="text-xs font-medium text-slate-800">Cross-Ventilation Windows</span>
              <input
                type="checkbox"
                checked={profile.hasCrossVentilation}
                onChange={(e) => onUpdateProfile({ hasCrossVentilation: e.target.checked })}
                className="h-4 w-4 accent-teal-800"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200 p-4">
            <div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="indoor-room-count" className="text-xs font-medium text-slate-800">
                  Active Rooms:{' '}
                  <span className="font-mono font-semibold text-teal-900 tabular-nums">
                    {activeRooms} of {totalRooms} {totalRooms === 1 ? 'Room / PG' : 'Rooms'}
                  </span>
                </label>
                <InfoTooltip
                  label="More information about Active Rooms"
                  content="Active Rooms are the rooms in your house that are regularly used or accessed by household members (such as bedrooms, living areas, and study rooms)."
                  align="left"
                />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Capped at {totalRooms} total {totalRooms === 1 ? 'room' : 'rooms'} specified in House Details.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 tabular-nums">
              <span>1</span>
              <input
                id="indoor-room-count"
                type="range"
                min={1}
                max={totalRooms}
                step={1}
                disabled={totalRooms <= 1}
                value={activeRooms}
                onChange={(e) =>
                  onUpdateProfile({ activeRoomCount: clampActiveRooms(Number(e.target.value), totalRooms) })
                }
                className="w-36 accent-teal-800 disabled:opacity-50"
              />
              <span>{totalRooms}</span>
            </div>
          </div>
        </div>

        <IndoorReductionMeter meter={indoorMeter} />
      </section>

      <IndoorQuestionsPanel
        questions={indoorQuestions}
        answers={indoorAnswers}
        loadingMore={loadingMoreIndoorQuestions}
        moreError={moreIndoorQuestionsError}
        onSetAnswer={onSetIndoorAnswer}
        onAskTwoMore={onAskTwoMoreIndoorQuestions}
      />

      <section aria-label="Room-by-room indoor air protocol" className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Room-by-Room Indoor Air Protocol
            </h2>
            <p className="text-xs text-slate-600">
              Practical Indian apartment mitigation for {liveData.location.name} (CPCB AQI {cpcb.aqi}) ·{' '}
              {profile.hasPurifier ? 'HEPA Purifier Mode' : 'Zero-Purifier Budget DIY Mode'}.
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerateProtocol}
            disabled={indoorSlot.loading}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-teal-900 disabled:opacity-60"
          >
            {indoorSlot.loading
              ? 'Generating Protocol…'
              : indoorSlot.data
                ? 'Refresh Indoor Protocol'
                : 'Generate Room-by-Room Indoor Protocol'}
          </button>
        </div>

        {indoorSlot.error && (
          <p role="status" className="mt-4 border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            Gemini live note ({indoorSlot.error}) — showing deterministic indoor protocol grounded in live Open-Meteo readings.
          </p>
        )}

        {!indoorSlot.data && !indoorSlot.loading && (
          <p className="mt-4 text-sm text-slate-600">
            Adjust your home setup toggles above and click <strong className="font-medium text-slate-900">Generate Room-by-Room Indoor Protocol</strong> for Living Room, Bedroom / Nursery, and Kitchen playbooks.
          </p>
        )}

        {indoorSlot.data && (
          <div className="mt-5 space-y-5">
            <p className="text-sm font-medium text-slate-900">{indoorSlot.data.protocolHeadline}</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {indoorSlot.data.rooms.map((room) => (
                <article key={room.room} className="flex flex-col justify-between border border-slate-200 p-5">
                  <div>
                    <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <h3 className="text-sm font-semibold text-slate-900">{room.room}</h3>
                      <span className="font-mono text-[11px] font-semibold text-teal-900 uppercase">
                        {room.priorityLevel}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-800">
                      {room.hacks.map((hack) => (
                        <li key={hack} className="flex items-start gap-2">
                          <span aria-hidden="true" className="font-mono text-teal-800">→</span>
                          <span>{hack}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-4 border-t border-slate-100 pt-2.5 font-mono text-[11px] text-slate-600">
                    Cost Tier: {room.costTier}
                  </p>
                </article>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
              <div className="border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
                <strong className="block font-semibold text-slate-900">
                  Scientific Reality Check on Indoor Plants
                </strong>
                <p className="mt-1">{indoorSlot.data.plantRealityCheck}</p>
              </div>
              <div className="border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
                <strong className="block font-semibold text-slate-900">
                  High-Leverage Low-Cost Upgrade
                </strong>
                <p className="mt-1">{indoorSlot.data.budgetTip}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
