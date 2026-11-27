import type {
  CommunityBriefingResponse,
  CpcbAqiResult,
  DailyRoutineResponse,
  HouseholdProfile,
  IndoorProtocolResponse,
  LiveAirQualityData,
} from '../types';
import type { HabitSwapTotals, IndoorMitigationMeter } from './emissionsCalculator';
import type { VentilationAnalysis } from './ventilationWindows';

export interface MasterRunbookPayload {
  generatedAtIso: string;
  city: string;
  sourceName: string;
  readingIsoTime: string;
  cpcbAqi: number;
  cpcbCategory: string;
  dominantPollutant: string;
  profile: HouseholdProfile;
  protectionScorePct: number;
  ventilationSummary: {
    bestWindow: string;
    worstWindow: string;
    safeHours: number;
  };
  indoorMitigation: IndoorMitigationMeter;
  weeklySwapSavings: {
    weeklyCo2KgAvoided: number;
    pm25ExposureReductionPct: number;
    monthlyRupeesSaved: number;
  };
  dailyRoutine: DailyRoutineResponse | null;
  indoorProtocol: IndoorProtocolResponse | null;
  communityBriefing: CommunityBriefingResponse | null;
}

export function assembleRunbookPayload(params: {
  liveData: LiveAirQualityData;
  cpcb: CpcbAqiResult;
  profile: HouseholdProfile;
  protectionScorePct: number;
  ventilation: VentilationAnalysis;
  indoorMitigation: IndoorMitigationMeter;
  swapTotals: HabitSwapTotals;
  routine: DailyRoutineResponse | null;
  indoorProtocol: IndoorProtocolResponse | null;
  communityBriefing: CommunityBriefingResponse | null;
}): MasterRunbookPayload {
  const bestWindow = params.ventilation.bestWindow
    ? `${params.ventilation.bestWindow.startHourLabel}–${params.ventilation.bestWindow.endHourLabel} (avg ${params.ventilation.bestWindow.avgPm25} µg/m³)`
    : 'N/A';
  const worstWindow = params.ventilation.worstWindow
    ? `${params.ventilation.worstWindow.startHourLabel}–${params.ventilation.worstWindow.endHourLabel} (peak ${params.ventilation.worstWindow.peakPm25} µg/m³)`
    : 'N/A';

  return {
    generatedAtIso: new Date().toISOString(),
    city: `${params.liveData.location.name}, ${params.liveData.location.country}`,
    sourceName: params.liveData.sourceName,
    readingIsoTime: params.liveData.readingIsoTime,
    cpcbAqi: params.cpcb.aqi,
    cpcbCategory: params.cpcb.category.name,
    dominantPollutant: params.cpcb.dominantPollutant?.symbol ?? 'N/A',
    profile: params.profile,
    protectionScorePct: params.protectionScorePct,
    ventilationSummary: {
      bestWindow,
      worstWindow,
      safeHours: params.ventilation.safeHourCount,
    },
    indoorMitigation: params.indoorMitigation,
    weeklySwapSavings: {
      weeklyCo2KgAvoided: params.swapTotals.weeklyCo2KgAvoided,
      pm25ExposureReductionPct: params.swapTotals.pm25ExposureReductionPct,
      monthlyRupeesSaved: params.swapTotals.monthlyRupeesSaved,
    },
    dailyRoutine: params.routine,
    indoorProtocol: params.indoorProtocol,
    communityBriefing: params.communityBriefing,
  };
}

export function formatRunbookMarkdown(runbook: MasterRunbookPayload): string {
  const lines: string[] = [
    `# BreatheWise — Master Clean-Air Runbook`,
    ``,
    `- **City:** ${runbook.city}`,
    `- **Indian CPCB National AQI:** ${runbook.cpcbAqi} (${runbook.cpcbCategory}) · Dominant: ${runbook.dominantPollutant}`,
    `- **Live Source:** ${runbook.sourceName} · Reading ISO: ${runbook.readingIsoTime}`,
    `- **Household Profile:** ${runbook.profile.profileName}`,
    `- **Daily Clean-Air Protection Score:** ${runbook.protectionScorePct}%`,
    ``,
    `## 1. Ventilation & Indoor Air Summary`,
    `- **Best Ventilation Window:** ${runbook.ventilationSummary.bestWindow}`,
    `- **Peak Smog Danger Window:** ${runbook.ventilationSummary.worstWindow}`,
    `- **Indoor PM2.5 Reduction:** ${runbook.indoorMitigation.beforePm25} µg/m³ -> ${runbook.indoorMitigation.afterPm25} µg/m³ (−${runbook.indoorMitigation.reductionPercent}%)`,
    ``,
    `## 2. Weekly Low-Emission Swap Impact`,
    `- **CO₂ Avoided:** ${runbook.weeklySwapSavings.weeklyCo2KgAvoided} kg / week`,
    `- **PM2.5 Exposure Reduction:** −${runbook.weeklySwapSavings.pm25ExposureReductionPct}%`,
    `- **Estimated Monthly Fuel/Energy Savings:** ₹${runbook.weeklySwapSavings.monthlyRupeesSaved.toLocaleString('en-IN')}`,
    ``,
  ];

  if (runbook.dailyRoutine) {
    lines.push(`## 3. Daily Low-Emission Routine (${runbook.dailyRoutine.routineHeadline})`, ``);
    for (const blk of runbook.dailyRoutine.blocks) {
      lines.push(
        `### ${blk.timeBlock} (${blk.timeRange}) — ${blk.title}`,
        `- **Action:** ${blk.recommendedAction}`,
        `- **Why This Matters:** ${blk.whyThisMatters}`,
        `- **Prep/Gear:** ${blk.gearOrPrep}`,
        ``,
      );
    }
  }

  if (runbook.indoorProtocol) {
    lines.push(`## 4. Room-by-Room Indoor Protocol`, ``);
    for (const room of runbook.indoorProtocol.rooms) {
      lines.push(`### ${room.room} (${room.priorityLevel} · ${room.costTier})`);
      for (const hack of room.hacks) {
        lines.push(`- ${hack}`);
      }
      lines.push(``);
    }
    lines.push(`> **Indoor Plant Note:** ${runbook.indoorProtocol.plantRealityCheck}`, ``);
  }

  if (runbook.communityBriefing) {
    lines.push(
      `## 5. Shareable Advisories`,
      `**WhatsApp Family Advisory:** ${runbook.communityBriefing.whatsappAdvisory}`,
      ``,
      `**RWA Society Notice:** ${runbook.communityBriefing.rwaNotice}`,
      ``,
      `**Carpool Pitch:** ${runbook.communityBriefing.carpoolPitch}`,
      ``,
    );
  }

  return lines.join('\n');
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
