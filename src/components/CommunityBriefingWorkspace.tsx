import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
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
import {
  assembleRunbookPayload,
  formatRunbookMarkdown,
  triggerFileDownload,
} from '../utils/runbookExport';

interface CommunityBriefingWorkspaceProps {
  liveData: LiveAirQualityData;
  cpcb: CpcbAqiResult;
  profile: HouseholdProfile;
  ventilation: VentilationAnalysis;
  indoorMeter: IndoorMitigationMeter;
  swapTotals: HabitSwapTotals;
  protectionScorePct: number;
  routine: DailyRoutineResponse | null;
  indoorProtocol: IndoorProtocolResponse | null;
  communitySlot: AsyncSlot<CommunityBriefingResponse>;
  onGenerateBriefing: () => void;
}

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
}: CommunityBriefingWorkspaceProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
    } catch {
      setCopiedKey(null);
    }
  };

  const buildPayload = () =>
    assembleRunbookPayload({
      liveData,
      cpcb,
      profile,
      protectionScorePct,
      ventilation,
      indoorMitigation: indoorMeter,
      swapTotals,
      routine,
      indoorProtocol,
      communityBriefing: communitySlot.data,
    });

  const handleDownloadJson = () => {
    const payload = buildPayload();
    const slug = liveData.location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(`breathewise-runbook-${slug}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setExportNote(`Exported breathewise-runbook-${slug}.json with live Open-Meteo timestamp ${liveData.readingIsoTime}.`);
  };

  const handleDownloadMarkdown = () => {
    const payload = buildPayload();
    const md = formatRunbookMarkdown(payload);
    const slug = liveData.location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(`breathewise-runbook-${slug}.md`, md, 'text/markdown;charset=utf-8');
    setExportNote(`Exported printable Markdown runbook (breathewise-runbook-${slug}.md).`);
  };

  const shareCards = communitySlot.data
    ? [
        { id: 'whatsapp', title: 'WhatsApp Family Group Advisory', text: communitySlot.data.whatsappAdvisory },
        { id: 'rwa', title: 'RWA / Apartment Society Notice', text: communitySlot.data.rwaNotice },
        { id: 'carpool', title: 'School / Office Carpool Pitch', text: communitySlot.data.carpoolPitch },
      ]
    : [];

  return (
    <div id="panel-community" role="tabpanel" aria-labelledby="tab-community" className="space-y-6">
      <section aria-label="Community and family briefing generator" className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Family & Community Clean-Air Briefing
            </h2>
            <p className="text-xs text-slate-600">
              Synthesizes live {liveData.location.name} CPCB AQI ({cpcb.aqi}), your cleanest ventilation window, and weekly low-emission savings into ready-to-share messages.
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
          <p role="status" className="mt-4 border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            Gemini live note ({communitySlot.error}) — showing deterministic advisories grounded in live Open-Meteo data.
          </p>
        )}

        {!communitySlot.data && !communitySlot.loading && (
          <p className="mt-4 text-sm text-slate-600">
            Click <strong className="font-medium text-slate-900">Generate Community Briefing</strong> to create an executive air-health snapshot plus copyable WhatsApp, RWA, and carpool notices.
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
                  <span className="font-mono text-[11px] text-slate-600">Source: {communitySlot.data.source}</span>
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
                  <article key={card.id} className="flex flex-col justify-between border border-slate-200 p-5">
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                        <button
                          type="button"
                          onClick={() => handleCopy(card.id, card.text)}
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

      <section aria-label="Master Clean-Air Runbook export" className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Master Clean-Air Runbook Export
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Downloads your live {liveData.location.name} CPCB AQI audit, ventilation window, indoor mitigation meter, swap savings, and generated plans.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 whitespace-nowrap transition-colors hover:bg-slate-50"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white whitespace-nowrap transition-colors hover:bg-teal-900"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Export Printable Markdown
            </button>
          </div>
        </div>
        {exportNote && (
          <p role="status" className="mt-3 font-mono text-xs text-teal-900">
            {exportNote}
          </p>
        )}
      </section>
    </div>
  );
}
