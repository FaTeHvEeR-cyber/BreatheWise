import type {
  ClarifyingQuestion,
  CpcbAqiResult,
  HouseholdProfile,
  IndoorProtocolResponse,
  LiveAirQualityData,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import type { IndoorMitigationMeter } from '../utils/emissionsCalculator';
import { IndoorSetupCard } from './IndoorSetupCard';
import { IndoorReductionMeter } from './IndoorReductionMeter';
import { IndoorQuestionsPanel } from './IndoorQuestionsPanel';

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

export default function IndoorLabWorkspace(props: IndoorLabWorkspaceProps) {
  const {
    liveData,
    cpcb,
    profile,
    hasHouseholdProfile,
    indoorMeter,
    indoorSlot,
    indoorQuestions,
    indoorAnswers,
    loadingMoreIndoorQuestions,
    moreIndoorQuestionsError,
    onUpdateProfile,
    onSetIndoorAnswer,
    onAskTwoMoreIndoorQuestions,
    onGenerateProtocol,
  } = props;

  return (
    <div id="panel-indoor" role="tabpanel" aria-labelledby="tab-indoor" className="space-y-6">
      <section
        aria-label="Home setup and indoor PM2.5 reduction meter"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <IndoorSetupCard
          profile={profile}
          hasHouseholdProfile={hasHouseholdProfile}
          onUpdateProfile={onUpdateProfile}
        />
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

      <section
        aria-label="Room-by-room indoor air protocol"
        className="border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Room-by-Room Indoor Air Protocol
            </h2>
            <p className="text-xs text-slate-600">
              Practical Indian apartment mitigation for {liveData.location.name} (CPCB AQI{' '}
              {cpcb.aqi}) ·{' '}
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
          <p
            role="status"
            className="mt-4 border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
          >
            Gemini live note ({indoorSlot.error}) — showing deterministic indoor protocol grounded
            in live Open-Meteo readings.
          </p>
        )}

        {!indoorSlot.data && !indoorSlot.loading && (
          <p className="mt-4 text-sm text-slate-600">
            Adjust your home setup toggles above and click{' '}
            <strong className="font-medium text-slate-900">
              Generate Room-by-Room Indoor Protocol
            </strong>{' '}
            for Living Room, Bedroom / Nursery, and Kitchen playbooks.
          </p>
        )}

        {indoorSlot.data && (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">
                {indoorSlot.data.protocolHeadline}
              </p>
              {indoorSlot.data.source && (
                <span className="font-mono text-[11px] text-slate-600">
                  Source: {indoorSlot.data.source}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {indoorSlot.data.rooms.map((room) => (
                <article
                  key={room.room}
                  className="flex flex-col justify-between border border-slate-200 p-5"
                >
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
                          <span aria-hidden="true" className="font-mono text-teal-800">
                            →
                          </span>
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
