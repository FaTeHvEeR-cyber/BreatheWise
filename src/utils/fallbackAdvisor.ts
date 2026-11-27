import type {
  ClarifyingQuestionsResponse,
  CpcbAqiResult,
  DailyRoutineResponse,
  HouseholdProfile,
  IndoorProtocolResponse,
  LiveAirQualityData,
} from '../types';
import type { VentilationAnalysis } from './ventilationWindows';
import {
  buildFallbackCommunityBriefing,
  buildFallbackShockStrategies,
} from './fallbackCommunityAdvisor';

export { buildFallbackCommunityBriefing, buildFallbackShockStrategies };

/** Builds deterministic clarifying intake questions when live AI is unavailable. */
export function buildFallbackQuestions(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  profile: HouseholdProfile,
): ClarifyingQuestionsResponse {
  return {
    source: 'deterministic',
    sourceMode: 'fallback',
    airContextNote: `${liveData.location.name} is at CPCB AQI ${cpcb.aqi} (${cpcb.category.name}, dominant ${cpcb.dominantPollutant?.symbol ?? 'PM2.5'}). Confirm three household constraints so we tailor your daily routine.`,
    questions: [
      {
        id: 'q-commute',
        question: 'Can you shift today’s commute time or switch to enclosed transit/carpool?',
        reason: `Morning traffic inversion amplifies kerbside exposure around ${liveData.location.name}.`,
        quickOptions: [
          'Yes — can switch to AC Metro / carpool',
          'Can shift departure after 10:30 AM',
          'Fixed rush-hour schedule (need N95 plan)',
        ],
      },
      {
        id: 'q-kitchen',
        question: 'How is kitchen smoke vented during morning/evening Indian cooking?',
        reason: `Your profile lists ${profile.cookingFuel.replace('_', ' ')} cooking; tadka spikes indoor PM2.5 rapidly.`,
        quickOptions: [
          'Electric chimney + open kitchen window',
          'Exhaust fan only',
          'No exhaust — rely on balcony door & induction',
        ],
      },
      {
        id: 'q-indoor',
        question: 'What is your biggest indoor air bottleneck right now?',
        reason: profile.hasPurifier
          ? 'Optimizing single-room CADR sealing maximizes HEPA performance.'
          : 'Budget zero-purifier sealing prioritizes cleanest-window airing and dust suppression.',
        quickOptions: [
          'Bedroom overnight stuffiness / CO₂',
          'Kids or seniors needing safe afternoon activity',
          'Balcony door gaps letting highway dust in',
        ],
      },
    ],
  };
}

/** Builds a deterministic 4-block daily routine grounded in live Open-Meteo data. */
export function buildFallbackRoutine(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  profile: HouseholdProfile,
  ventilation: VentilationAnalysis,
): DailyRoutineResponse {
  const bestWin = ventilation.bestWindow
    ? `${ventilation.bestWindow.startHourLabel} – ${ventilation.bestWindow.endHourLabel}`
    : '1 PM – 3 PM';
  const worstWin = ventilation.worstWindow
    ? `${ventilation.worstWindow.startHourLabel} – ${ventilation.worstWindow.endHourLabel}`
    : '7 AM – 9 AM';
  const severeOrPoor = cpcb.aqi > 200;

  const profileLabel = profile.profileName.trim() || `${liveData.location.name} Household`;
  const membersLabel = profile.vulnerableMembers.trim() || 'all household members';

  return {
    source: 'deterministic',
    sourceMode: 'fallback',
    routineHeadline: `${liveData.location.name} (CPCB AQI ${cpcb.aqi} · ${cpcb.category.name}) Low-Emission Routine for ${profileLabel}`,
    blocks: [
      {
        id: 'blk-morning',
        timeBlock: 'Morning',
        timeRange: '6:30 AM – 10:30 AM',
        title: severeOrPoor
          ? 'Seal Morning Inversion & Protected Commute'
          : 'Low-Exposure Morning Start',
        recommendedAction: severeOrPoor
          ? `Keep windows closed during peak inversion (${worstWin}). Swap outdoor exercise indoors and take AC metro/carpool or wear a tight-fit N95 for your ${profile.commuteDistanceKm} km route.`
          : `Complete light outdoor commute or errands before peak traffic; favor transit/carpool over solo petrol driving.`,
        whyThisMatters: `Reduces morning PM2.5 inhalation by ~40–48% during kerbside traffic peaks (live PM2.5 ${liveData.current.pm2_5?.toFixed(1) ?? '—'} µg/m³) while cutting cold-start CO₂.`,
        protectionWeight: 30,
        gearOrPrep: severeOrPoor
          ? 'Certified N95/FFP2 respirator + closed-cabin recirculation'
          : 'Reusable cloth/surgical mask if near arterial road',
      },
      {
        id: 'blk-midday',
        timeBlock: 'Midday',
        timeRange: bestWin,
        title: `Cleanest-Window Cross-Ventilation (${bestWin})`,
        recommendedAction: `Open opposite windows for 15–20 minutes during the lowest forecast PM2.5 trough (${bestWin}, avg ${ventilation.bestWindow?.avgPm25.toFixed(1) ?? '—'} µg/m³) to flush stale indoor CO₂, then reseal.`,
        whyThisMatters:
          'Refreshes oxygen and cuts indoor CO₂ buildup with minimal particulate infiltration compared to 7 AM airing.',
        protectionWeight: 25,
        gearOrPrep: 'Exhaust fan assist + wet microfiber floor wipe',
      },
      {
        id: 'blk-evening',
        timeBlock: 'Evening',
        timeRange: '5:30 PM – 9:00 PM',
        title: 'Low-Smoke Cooking & Zero-Idle Errands',
        recommendedAction: `Batch grocery runs into a single trip and run kitchen exhaust/chimney (or shift boiling to induction) during dinner prep so cooking plumes do not compound evening smog.`,
        whyThisMatters:
          'Prevents indoor kitchen PM2.5 spikes above 250 µg/m³ and cuts short-trip tailpipe NOx emissions.',
        protectionWeight: 25,
        gearOrPrep: profile.hasKitchenExhaust
          ? 'Chimney on high + 5-min post-cooking run'
          : 'Lid on pans + kitchen exhaust/window purge',
      },
      {
        id: 'blk-night',
        timeBlock: 'Night',
        timeRange: '9:30 PM – 6:30 AM',
        title: 'Clean-Air Sleep Sanctuary',
        recommendedAction: profile.hasPurifier
          ? 'Close bedroom doors/windows and run HEPA purifier continuously on low-noise sleep mode for 4–5 air changes/hour.'
          : 'Seal bedroom door gaps with damp/rolled cotton draft stoppers, wet-wipe bedside surfaces, and keep windows latched overnight.',
        whyThisMatters: `Protects ${membersLabel} during 8 hours of nocturnal temperature inversion when ambient PM2.5 concentrates near ground level.`,
        protectionWeight: 20,
        gearOrPrep: profile.hasPurifier
          ? 'HEPA purifier 30 cm clear of walls'
          : 'Rolled towel draft stopper + saline nasal rinse',
      },
    ],
    dailySummaryNote: `Grounded strictly in live Open-Meteo telemetry for ${liveData.location.name} (${liveData.readingIsoTime}).`,
  };
}

/** Builds a deterministic room-by-room indoor air mitigation protocol. */
export function buildFallbackIndoorProtocol(
  liveData: LiveAirQualityData,
  cpcb: CpcbAqiResult,
  profile: HouseholdProfile,
): IndoorProtocolResponse {
  const membersLabel = profile.vulnerableMembers.trim() || 'all household members';
  return {
    source: 'deterministic',
    sourceMode: 'fallback',
    protocolHeadline: `${profile.hasPurifier ? 'HEPA-Assisted' : 'Budget Zero-Purifier'} Indoor Air Protocol for ${liveData.location.name} (CPCB AQI ${cpcb.aqi})`,
    rooms: [
      {
        room: 'Living Room',
        priorityLevel: cpcb.aqi > 200 ? 'Critical' : 'High',
        costTier: profile.hasPurifier ? 'Existing HEPA + ₹0 habits' : '₹0–₹1,200 DIY budget',
        hacks: [
          profile.hasPurifier
            ? 'Position the HEPA unit centrally at least 30 cm away from curtains/walls and close balcony sliders to match rated CADR.'
            : 'Seal balcony slider gaps with foam weatherstripping or rolled cotton towels; consider a DIY MERV-13/HEPA filter taped to a box fan for peak smog weeks.',
          'Replace dry jhadu sweeping with damp microfiber mopping every morning so settled PM10/PM2.5 road dust is not resuspended.',
          'Create a shoe-free entry mat zone to stop tracked-in heavy metals and soot dust.',
        ],
      },
      {
        room: 'Bedroom / Nursery',
        priorityLevel: 'Critical',
        costTier: 'Zero-cost sealing + sleep mode',
        hacks: [
          `Designate one closed sleeping room as the cleanest zone for ${membersLabel}, avoiding incense/agarbatti or mosquito coils.`,
          profile.hasPurifier
            ? 'Pre-run HEPA on Turbo for 20 minutes before bedtime, then switch to Sleep mode all night.'
            : 'Hang a lightly damp cotton sheet over cracked vents only if room feels stuffy; keep main windows latched overnight during inversion.',
          'Wash pillowcases weekly in warm water to clear deposited fine particulates.',
        ],
      },
      {
        room: 'Kitchen',
        priorityLevel: profile.cookingFuel === 'induction' ? 'Moderate' : 'Critical',
        costTier: '₹0 habit shift',
        hacks: [
          profile.hasKitchenExhaust
            ? 'Switch on the chimney/exhaust 2 minutes before tadka/tempering and keep running 5 minutes after flame-off.'
            : 'Close the kitchen-to-hallway door during high-heat tadka, crack only the kitchen exhaust window briefly, and cover pans with lids.',
          'Move tea, dal boiling, and reheating onto an electric kettle or induction cooktop to reduce indoor NO₂.',
        ],
      },
    ],
    plantRealityCheck:
      'Hardy indoor plants (Snake Plant, Areca Palm, Peace Lily) improve room humidity and comfort, but peer-reviewed chamber studies confirm plants cannot meaningfully lower PM2.5 during Poor/Severe smog—always treat them as a supplement to sealing and HEPA/exhaust filtration.',
    budgetTip:
      'A ₹200 foam weatherstrip tape around leaky window frames often cuts outdoor dust infiltration by 15–25%.',
  };
}
