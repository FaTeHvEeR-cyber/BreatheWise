import { useState, type ReactElement } from 'react';
import { Check, Copy } from 'lucide-react';
import type {
  CommunityBriefingResponse,
  CpcbAqiResult,
  DailyRoutineResponse,
  HouseholdProfile,
  IndoorProtocolResponse,
  LiveAirQualityData,
} from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';
import type { HabitSwapTotals, IndoorMitigationMeter } from '../utils/emissionsCalculator';
import type { VentilationAnalysis } from '../utils/ventilationWindows';
import { RunbookExportSection } from './RunbookExportSection';

interface CommunityBriefingWorkspaceProps {
  readonly liveData: LiveAirQualityData;
  readonly cpcb: CpcbAqiResult;
  readonly profile: HouseholdProfile;
  readonly ventilation: VentilationAnalysis;
  readonly indoorMeter: IndoorMitigationMeter;
  readonly swapTotals: HabitSwapTotals;
  readonly protectionScorePct: number;
  readonly routine: DailyRoutineResponse | null;
  readonly indoorProtocol: IndoorProtocolResponse | null;
  readonly communitySlot: AsyncSlot<CommunityBriefingResponse>;
  readonly onGenerateBriefing: () => void;
}

/** Workspace 5: shareable family, RWA, and carpool advisories plus runbook exports. */
export default function CommunityBriefingWorkspace({
  liveData,
  cpcb,
  profile,
  ventilation,
  indoorMeter,
  swapTotals,
  protectionScorePct,
  routine,
  indoorProtocol,
  communitySlot,
  onGenerateBriefing,
}: CommunityBriefingWorkspaceProps): ReactElement {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
    } catch {
      setCopiedKey(null);
    }
  };

  const shareCards = communitySlot.data
    ? [
        {
          id: 'whatsapp',
          title: 'WhatsApp Family Group Advisory',
          text: communitySlot.data.whatsappAdvisory,
        },
        {
          id: 'rwa',
          title: 'RWA / Apartment Society Notice',
          text: communitySlot.data.rwaNotice,
        },
        {
          id: 'carpool',
          title: 'School / Office Carpool Pitch',
          text: communitySlot.data.carpoolPitch,
        },
      ]
    : [];

  return (
    <div id="panel-community" role="tabpanel" aria-labelledby="tab-community" className="space-y-6">
      <section
        aria-label="Community and family briefing generator"
        className="border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Family & Community Clean-Air Briefing
            </h2>
            <p className="text-xs text-slate-600">
              Synthesizes live {liveData.location.name} CPCB AQI ({cpcb.aqi}), your cleanest
              ventilation window, and weekly low-emission savings into ready-to-share messages.
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerateBriefing}
            disabled={communitySlot.loading}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-teal-900 disabled:opacity-60"
          >
            {communitySlot.loading
              ? 'Drafting Briefing…'
              : communitySlot.data
                ? 'Regenerate Briefing'
                : 'Generate Community Briefing'}
          </button>
        </div>

        {communitySlot.error && (
          <p
            role="status"
            className="mt-4 border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
          >
            Gemini live note ({communitySlot.error}) — showing deterministic advisories grounded in
            live Open-Meteo data.
          </p>
        )}

        {!communitySlot.data && !communitySlot.loading && (
          <p className="mt-4 text-sm text-slate-600">
            Click{' '}
            <strong className="font-medium text-slate-900">Generate Community Briefing</strong> to
            create an executive air-health snapshot plus copyable WhatsApp, RWA, and carpool
            notices.
          </p>
        )}

        {communitySlot.data && (
          <div className="mt-5 space-y-5">
            <div className="border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-[11px] font-semibold text-teal-900 uppercase">
                  Executive Air-Health Snapshot
                </p>
                {communitySlot.data.source && (
                  <span className="font-mono text-[11px] text-slate-600">
                    Source: {communitySlot.data.source}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-900">
                {communitySlot.data.executiveSnapshot}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {shareCards.map((card) => {
                const isCopied = copiedKey === card.id;
                return (
                  <article
                    key={card.id}
                    className="flex flex-col justify-between border border-slate-200 p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                        <button
                          type="button"
                          onClick={() => void handleCopy(card.id, card.text)}
                          aria-label={`Copy ${card.title}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 whitespace-nowrap transition-colors hover:bg-slate-50"
                        >
                          {isCopied ? (
                            <>
                              <Check aria-hidden="true" className="h-3.5 w-3.5 text-teal-800" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-slate-800">
                        {card.text}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <RunbookExportSection
        liveData={liveData}
        cpcb={cpcb}
        profile={profile}
        ventilation={ventilation}
        indoorMeter={indoorMeter}
        swapTotals={swapTotals}
        protectionScorePct={protectionScorePct}
        routine={routine}
        indoorProtocol={indoorProtocol}
        communityBriefing={communitySlot.data}
      />
    </div>
  );
}
