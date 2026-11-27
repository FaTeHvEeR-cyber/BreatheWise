import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  assembleRunbookPayload,
  formatRunbookMarkdown,
  triggerFileDownload,
} from './runbookExport';
import { EMPTY_HOUSEHOLD_PROFILE, EVALUATOR_SAMPLE_PROFILES } from '../data/breatheWisePresets';
import { computeCpcbAqi } from './cpcbAqi';
import { analyzeVentilationWindows } from './ventilationWindows';
import { calculateHabitSwapImpact, calculateIndoorMitigationImpact } from './emissionsCalculator';
import {
  buildFallbackCommunityBriefing,
  buildFallbackIndoorProtocol,
  buildFallbackRoutine,
} from './fallbackAdvisor';
import type { LiveAirQualityData } from '../types';

test('runbook export assembles deterministic payload and printable markdown', () => {
  const sample = EVALUATOR_SAMPLE_PROFILES[1];
  const liveData: LiveAirQualityData = {
    location: sample.city,
    sourceName: 'Open-Meteo Air Quality API',
    sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    readingIsoTime: '2026-11-26T08:00',
    fetchedAtIso: '2026-11-26T08:05:00.000Z',
    current: {
      pm2_5: 145,
      pm10: 210,
      nitrogen_dioxide: 48,
      ozone: 32,
      sulphur_dioxide: 14,
      us_aqi: 198,
    },
    hourly24h: Array.from({ length: 12 }, (_, idx) => ({
      isoTime: `2026-11-26T${String(idx).padStart(2, '0')}:00`,
      hourLabel: `${String(idx).padStart(2, '0')}:00`,
      pm2_5: idx >= 4 && idx <= 6 ? 48 : 135,
      pm10: 190,
      us_aqi: 180,
      cpcbPm25SubIndex: 310,
    })),
  };

  const cpcb = computeCpcbAqi(liveData.current);
  const ventilation = analyzeVentilationWindows(liveData.hourly24h, liveData.current.pm2_5 ?? 0);
  const indoorMitigation = calculateIndoorMitigationImpact(
    liveData.current.pm2_5 ?? 0,
    sample.profile,
  );
  const swapTotals = calculateHabitSwapImpact(
    sample.defaultSwapIds,
    sample.profile.commuteDistanceKm,
    145,
  );
  const routine = buildFallbackRoutine(liveData, cpcb, sample.profile, ventilation);
  const indoorProtocol = buildFallbackIndoorProtocol(liveData, cpcb, sample.profile);
  const communityBriefing = buildFallbackCommunityBriefing(
    liveData,
    cpcb,
    sample.profile,
    ventilation,
    swapTotals,
  );

  const payload = assembleRunbookPayload({
    liveData,
    cpcb,
    profile: sample.profile,
    protectionScorePct: 75,
    ventilation,
    indoorMitigation,
    swapTotals,
    routine,
    indoorProtocol,
    communityBriefing,
  });

  assert.equal(payload.cpcbAqi, cpcb.aqi);
  assert.equal(payload.protectionScorePct, 75);

  const md = formatRunbookMarkdown(payload);
  assert.ok(md.includes('BreatheWise — Master Clean-Air Runbook'));
  assert.ok(md.includes(`CPCB National AQI:** ${cpcb.aqi}`));
  assert.ok(md.includes('WhatsApp Family Advisory'));
  assert.ok(md.includes('Indoor Plant Note'));
});

test('runbook export handles null AI sections, missing windows, and file download trigger', () => {
  const sample = EVALUATOR_SAMPLE_PROFILES[0];
  const liveData: LiveAirQualityData = {
    location: sample.city,
    sourceName: 'Open-Meteo Air Quality API',
    sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    readingIsoTime: '2026-11-26T08:00',
    fetchedAtIso: '2026-11-26T08:05:00.000Z',
    current: {
      pm2_5: null,
      pm10: null,
      nitrogen_dioxide: null,
      ozone: null,
      sulphur_dioxide: null,
      us_aqi: null,
    },
    hourly24h: [],
  };

  const emptyCpcb = computeCpcbAqi(liveData.current);
  const payload = assembleRunbookPayload({
    liveData,
    cpcb: emptyCpcb,
    profile: EMPTY_HOUSEHOLD_PROFILE,
    protectionScorePct: 0,
    ventilation: analyzeVentilationWindows([], 0),
    indoorMitigation: calculateIndoorMitigationImpact(0, EMPTY_HOUSEHOLD_PROFILE),
    swapTotals: calculateHabitSwapImpact([], 10, 0),
    routine: null,
    indoorProtocol: null,
    communityBriefing: null,
  });

  assert.equal(payload.dominantPollutant, 'N/A');
  assert.equal(payload.ventilationSummary.bestWindow, 'N/A');
  assert.equal(payload.ventilationSummary.worstWindow, 'N/A');

  const md = formatRunbookMarkdown(payload);
  assert.ok(!md.includes('## 3. Daily Low-Emission Routine'));
  assert.ok(!md.includes('## 4. Room-by-Room Indoor Protocol'));
  assert.ok(!md.includes('## 5. Shareable Advisories'));

  const click = vi.fn();
  const remove = vi.fn();
  const anchor = { href: '', download: '', click, remove };
  const appendChild = vi.fn();
  vi.stubGlobal('document', {
    createElement: vi.fn(() => anchor),
    body: { appendChild },
  });
  const createObjectURL = vi.fn(() => 'blob:breathewise-test');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

  triggerFileDownload('runbook.md', md, 'text/markdown');
  assert.equal(anchor.download, 'runbook.md');
  assert.equal(click.mock.calls.length, 1);
  assert.equal(remove.mock.calls.length, 1);
  assert.equal(revokeObjectURL.mock.calls.length, 1);
  vi.unstubAllGlobals();
});
