import { describe, expect, it } from 'vitest';
import type { LiveAirQualityData } from '../types';
import { EMPTY_HOUSEHOLD_PROFILE, QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';
import { buildClarifyingQuestionsPayload, buildIndoorProtocolPayload } from './aiPayloads';
import { computeCpcbAqi } from './cpcbAqi';
import { calculateHabitSwapImpact, calculateIndoorMitigationImpact } from './emissionsCalculator';
import {
  buildFallbackCommunityBriefing,
  buildFallbackIndoorProtocol,
  buildFallbackRoutine,
  buildFallbackShockStrategies,
} from './fallbackAdvisor';
import { analyzeVentilationWindows } from './ventilationWindows';

const LOW_AQI_DATA: LiveAirQualityData = {
  location: QUICK_INDIAN_CITIES[4],
  sourceName: 'Open-Meteo Air Quality API',
  sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  readingIsoTime: '2026-11-27T11:00',
  fetchedAtIso: '2026-11-27T11:05:00.000Z',
  current: {
    pm2_5: null,
    pm10: 90,
    nitrogen_dioxide: 20,
    ozone: 15,
    sulphur_dioxide: 8,
    us_aqi: 70,
  },
  hourly24h: [],
};

describe('deterministic fallback advisors and payload branches', () => {
  it('adapts fallback routine and indoor protocol for moderate AQI, null windows, and induction fuel', () => {
    const lowCpcb = computeCpcbAqi(LOW_AQI_DATA.current);
    const noWindowVent = analyzeVentilationWindows([], 0);
    const inductionProfile = {
      ...EMPTY_HOUSEHOLD_PROFILE,
      cookingFuel: 'induction' as const,
      hasPurifier: false,
      hasKitchenExhaust: false,
    };

    const routine = buildFallbackRoutine(LOW_AQI_DATA, lowCpcb, inductionProfile, noWindowVent);
    expect(routine.source).toBe('deterministic');
    expect(routine.blocks[0].title).toBe('Low-Exposure Morning Start');
    expect(routine.blocks[1].timeRange).toBe('1 PM – 3 PM');
    expect(routine.blocks[3].gearOrPrep).toContain('draft stopper');

    const indoor = buildFallbackIndoorProtocol(LOW_AQI_DATA, lowCpcb, inductionProfile);
    expect(indoor.rooms[0].priorityLevel).toBe('High');
    expect(indoor.rooms[2].priorityLevel).toBe('Moderate');

    const briefing = buildFallbackCommunityBriefing(
      LOW_AQI_DATA,
      lowCpcb,
      inductionProfile,
      noWindowVent,
      calculateHabitSwapImpact([], 10, 0),
    );
    expect(briefing.executiveSnapshot).toContain('1 PM – 3 PM');
    expect(briefing.whatsappAdvisory).toContain('— µg/m³');

    const shock = buildFallbackShockStrategies('Sudden Dust Storm', LOW_AQI_DATA, lowCpcb);
    expect(shock.strategies).toHaveLength(3);
  });

  it('builds household & indoor payloads cleanly with optional indoorAnswers and notes', () => {
    const lowCpcb = computeCpcbAqi(LOW_AQI_DATA.current);
    const meter = calculateIndoorMitigationImpact(50, EMPTY_HOUSEHOLD_PROFILE);
    const withAnswers = buildIndoorProtocolPayload(
      LOW_AQI_DATA,
      lowCpcb,
      EMPTY_HOUSEHOLD_PROFILE,
      true,
      meter,
      'Close balcony by 6 PM',
      { q1: 'Bedroom only', q2: '   ' },
    );
    expect(withAnswers.indoorAnswers).toEqual({ q1: 'Bedroom only' });
    expect(withAnswers.additionalContext).toBe('Close balcony by 6 PM');

    const qPayload = buildClarifyingQuestionsPayload(
      LOW_AQI_DATA,
      lowCpcb,
      { ...EMPTY_HOUSEHOLD_PROFILE, profileName: 'Family' },
      true,
      'Prefer metro',
    );
    expect(qPayload.household).toContain('vulnerable=none');
    expect(qPayload.notes).toBe('Prefer metro');
  });
});
