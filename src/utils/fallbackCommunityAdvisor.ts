import type {
  CommunityBriefingResponse,
  CpcbAqiResult,
  HouseholdProfile,
  LiveAirQualityData,
  SmogShockResponse,
} from '../types';
import type { HabitSwapTotals } from './emissionsCalculator';
import type { VentilationAnalysis } from './ventilationWindows';

/** Builds deterministic emergency fallback strategies for a smog shock scenario. */
export function buildFallbackShockStrategies(
  shockScenario: string,
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
): SmogShockResponse {
  return {
    source: 'deterministic',
    sourceMode: 'fallback',
    shockScenario,
    severityAssessment: `Immediate contingency response for "${shockScenario}" layered onto ${liveData.location.name}'s live baseline (CPCB AQI ${cpcb.aqi}).`,
    strategies: [
      {
        id: 'shock-1',
        title: 'Emergency Clean-Room Consolidation',
        targetTimeBlock: 'Night',
        immediateAction:
          'Consolidate family members into the smallest interior room with fewest exterior windows, seal door undercuts with damp towels, and eliminate all indoor combustion (candles, incense, gas frying).',
        healthAndEmissionImpact:
          'Cuts passive indoor PM2.5 infiltration by ~35–40% even without active electricity.',
        updatedRoutineTitle: 'Shock Override: Sealed Clean-Room Sanctuary',
      },
      {
        id: 'shock-2',
        title: 'Peak-Window Deferral & Fit-Checked N95 Protocol',
        targetTimeBlock: 'Morning',
        immediateAction:
          'Defer non-urgent outdoor errands past 12:30 PM; if mandatory travel cannot wait, wear a nose-pinched N95/FFP2 respirator, avoid walking beside idling traffic, and use closed AC transit.',
        healthAndEmissionImpact:
          'Certified N95 filtration lowers inhaled fine particulate load by >85% during brief unavoidable exposure.',
        updatedRoutineTitle: 'Shock Override: Fit-Checked N95 & Deferred Travel',
      },
      {
        id: 'shock-3',
        title: 'Zero-Smoke Cold/Induction Meal Pivot',
        targetTimeBlock: 'Evening',
        immediateAction:
          'Pause high-heat frying or tadka for the next 12 hours; use pressure-cooked, steamed, or induction-prepared meals so zero indoor smoke compounds the external smog spike.',
        healthAndEmissionImpact:
          'Eliminates 150–300 µg/m³ indoor cooking spikes when windows cannot be opened safely.',
        updatedRoutineTitle: 'Shock Override: Zero-Smoke Kitchen Protocol',
      },
    ],
  };
}

/** Builds deterministic family, RWA, and carpool advisories grounded in live telemetry. */
export function buildFallbackCommunityBriefing(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  profile: HouseholdProfile,
  ventilation: VentilationAnalysis,
  swaps: HabitSwapTotals,
): CommunityBriefingResponse {
  const bestWin = ventilation.bestWindow
    ? `${ventilation.bestWindow.startHourLabel} – ${ventilation.bestWindow.endHourLabel}`
    : '1 PM – 3 PM';

  return {
    source: 'deterministic',
    sourceMode: 'fallback',
    executiveSnapshot: `${liveData.location.name} currently records Indian CPCB National AQI ${cpcb.aqi} (${cpcb.category.name}, dominant ${cpcb.dominantPollutant?.symbol ?? 'PM2.5'} at ${liveData.current.pm2_5?.toFixed(1) ?? '—'} µg/m³ as of ${liveData.readingIsoTime}). Best 3-hour airing window is ${bestWin}. Active low-emission swaps save ${swaps.weeklyCo2KgAvoided} kg CO₂/week and ₹${swaps.monthlyRupeesSaved.toLocaleString('en-IN')}/month.`,
    whatsappAdvisory: `Family Air Update (${liveData.location.name}): Live CPCB AQI is ${cpcb.aqi} (${cpcb.category.name}, PM2.5 ${liveData.current.pm2_5?.toFixed(1) ?? '—'} µg/m³). Please keep windows closed this morning, air out briefly between ${bestWin}, wet-mop instead of dry sweeping, and wear N95 masks if stepping out near main roads. Source: Open-Meteo (${liveData.readingIsoTime}).`,
    rwaNotice: `RWA / Society Clean-Air Notice — ${liveData.location.name} (CPCB AQI ${cpcb.aqi}, ${cpcb.category.name}): Residents are requested to halt open leaf/waste burning, pause dry driveway sweeping in favor of water-sprinkled cleaning, switch off idling vehicles at society gates, and limit outdoor kids' sports during peak smog hours.`,
    carpoolPitch: `Hi team/parents — with ${liveData.location.name} at CPCB AQI ${cpcb.aqi} (${cpcb.category.name}), I’m organizing a 3-seat AC carpool / Metro buddy group along our ${profile.commuteDistanceKm} km route. Sharing rides cuts ~${swaps.weeklyCo2KgAvoided} kg CO₂/week and reduces kerbside exhaust exposure—reply if you'd like to split days this week!`,
  };
}
