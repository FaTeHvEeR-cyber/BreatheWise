import type {
  CpcbAqiResult,
  HouseholdProfile,
  LiveAirQualityData,
} from '../types.js';
import type { HabitSwapTotals, IndoorMitigationMeter } from './emissionsCalculator.js';
import type { VentilationAnalysis } from './ventilationWindows.js';

export function buildClarifyingQuestionsPayload(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  profile: HouseholdProfile,
  hasHouseholdProfile: boolean,
  notes: string | null,
): Record<string, unknown> {
  const household = hasHouseholdProfile
    ? `${profile.profileName}: ${profile.commuteDistanceKm}km ${profile.commuteMode}, ${profile.cookingFuel}, purifier=${profile.hasPurifier}, exhaust=${profile.hasKitchenExhaust}, vulnerable=${profile.vulnerableMembers || 'none'}`
    : null;

  return {
    city: liveData.location.name,
    aqi: cpcb.aqi,
    category: cpcb.category.name,
    dominant: cpcb.dominantPollutant?.symbol ?? 'PM2.5',
    pm25: liveData.current.pm2_5,
    hasHouseholdProfile,
    ...(household ? { household } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function buildDailyRoutinePayload(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  ventilation: VentilationAnalysis,
  profile: HouseholdProfile,
  hasHouseholdProfile: boolean,
  answers: Record<string, string>,
  notes: string | null,
): Record<string, unknown> {
  return {
    city: liveData.location.name,
    readingIsoTime: liveData.readingIsoTime,
    cpcbAqi: cpcb.aqi,
    cpcbCategory: cpcb.category.name,
    currentPollutants: liveData.current,
    bestWindow: ventilation.bestWindow,
    worstWindow: ventilation.worstWindow,
    hasHouseholdProfile,
    profile: hasHouseholdProfile ? profile : null,
    clarifyingAnswers: answers,
    additionalContext: notes,
  };
}

export function buildIndoorProtocolPayload(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  profile: HouseholdProfile,
  hasHouseholdProfile: boolean,
  indoorMeter: IndoorMitigationMeter,
  notes: string | null,
  indoorAnswers?: Record<string, string>,
): Record<string, unknown> {
  const answered = indoorAnswers
    ? Object.fromEntries(Object.entries(indoorAnswers).filter(([, v]) => v.trim().length > 0))
    : {};
  return {
    city: liveData.location.name,
    cpcbAqi: cpcb.aqi,
    cpcbCategory: cpcb.category.name,
    outdoorPm25: liveData.current.pm2_5,
    hasHouseholdProfile,
    profile,
    indoorMeter,
    additionalContext: notes,
    ...(Object.keys(answered).length > 0 ? { indoorAnswers: answered } : {}),
  };
}

export function buildSmogShockPayload(
  shockScenario: string,
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  profile: HouseholdProfile,
  hasHouseholdProfile: boolean,
  activeRoutineHeadline: string | null,
): Record<string, unknown> {
  return {
    shockScenario,
    city: liveData.location.name,
    cpcbAqi: cpcb.aqi,
    outdoorPm25: liveData.current.pm2_5,
    hasHouseholdProfile,
    profile: hasHouseholdProfile ? profile : null,
    activeRoutineHeadline,
  };
}

export function buildCommunityBriefingPayload(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  ventilation: VentilationAnalysis,
  profile: HouseholdProfile,
  hasHouseholdProfile: boolean,
  swapTotals: HabitSwapTotals,
  routineHeadline: string | null,
): Record<string, unknown> {
  return {
    city: liveData.location.name,
    readingIsoTime: liveData.readingIsoTime,
    cpcbAqi: cpcb.aqi,
    cpcbCategory: cpcb.category.name,
    dominantPollutant: cpcb.dominantPollutant?.symbol ?? 'PM2.5',
    outdoorPm25: liveData.current.pm2_5,
    bestWindow: ventilation.bestWindow,
    hasHouseholdProfile,
    profile: hasHouseholdProfile ? profile : null,
    swapTotals: {
      weeklyCo2KgAvoided: swapTotals.weeklyCo2KgAvoided,
      pm25ExposureReductionPct: swapTotals.pm25ExposureReductionPct,
      monthlyRupeesSaved: swapTotals.monthlyRupeesSaved,
    },
    routineHeadline,
  };
}
