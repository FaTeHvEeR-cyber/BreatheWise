import { useState, type ReactElement } from 'react';
import { Download } from 'lucide-react';
import type {
  CommunityBriefingResponse,
  CpcbAqiResult,
  DailyRoutineResponse,
  HouseholdProfile,
  IndoorProtocolResponse,
  LiveAirQualityData,
} from '../types';
import type { HabitSwapTotals, IndoorMitigationMeter } from '../utils/emissionsCalculator';
import type { VentilationAnalysis } from '../utils/ventilationWindows';
import {
  assembleRunbookPayload,
  formatRunbookMarkdown,
  triggerFileDownload,
} from '../utils/runbookExport';

interface RunbookExportSectionProps {
  readonly liveData: LiveAirQualityData;
  readonly cpcb: CpcbAqiResult;
  readonly profile: HouseholdProfile;
  readonly ventilation: VentilationAnalysis;
  readonly indoorMeter: IndoorMitigationMeter;
  readonly swapTotals: HabitSwapTotals;
  readonly protectionScorePct: number;
  readonly routine: DailyRoutineResponse | null;
  readonly indoorProtocol: IndoorProtocolResponse | null;
  readonly communityBriefing: CommunityBriefingResponse | null;
}

/** Exports the assembled Master Clean-Air Runbook as JSON or printable Markdown. */
export function RunbookExportSection({
  liveData,
  cpcb,
  profile,
  ventilation,
  indoorMeter,
  swapTotals,
  protectionScorePct,
  routine,
  indoorProtocol,
  communityBriefing,
}: RunbookExportSectionProps): ReactElement {
  const [exportNote, setExportNote] = useState<string | null>(null);

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
      communityBriefing,
    });

  const handleDownloadJson = (): void => {
    const payload = buildPayload();
    const slug = liveData.location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(
      `breathewise-runbook-${slug}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    setExportNote(
      `Exported breathewise-runbook-${slug}.json with live Open-Meteo timestamp ${liveData.readingIsoTime}.`,
    );
  };

  const handleDownloadMarkdown = (): void => {
    const payload = buildPayload();
    const md = formatRunbookMarkdown(payload);
    const slug = liveData.location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(`breathewise-runbook-${slug}.md`, md, 'text/markdown;charset=utf-8');
    setExportNote(`Exported printable Markdown runbook (breathewise-runbook-${slug}.md).`);
  };

  return (
    <section
      aria-label="Master Clean-Air Runbook export"
      className="border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Master Clean-Air Runbook Export
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Downloads your live {liveData.location.name} CPCB AQI audit, ventilation window, indoor
            mitigation meter, swap savings, and generated plans.
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
  );
}
