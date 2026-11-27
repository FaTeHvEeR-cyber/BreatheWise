import { useCallback, useMemo, useState } from 'react';
import type { CityLocation, EvaluatorSampleProfile, HouseholdProfile, WorkspaceId } from '../types';
import { EMPTY_HOUSEHOLD_PROFILE, QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';
import { computeCpcbAqi } from '../utils/cpcbAqi';
import { analyzeVentilationWindows } from '../utils/ventilationWindows';
import {
  calculateHabitSwapImpact,
  calculateIndoorMitigationImpact,
} from '../utils/emissionsCalculator';
import { DEFAULT_AUTO_REFRESH_MS } from '../utils/timeFormatting';
import { applyRoomProfilePatch } from '../utils/numericInput';
import type { UseAirQualityAppReturn } from './hookTypes';
import { useBreatheWiseAi } from './useBreatheWiseAi';
import { useIndoorQuestions } from './useIndoorQuestions';
import { useLiveAqiTelemetry } from './useLiveAqiTelemetry';

export type { AsyncSlot } from './hookTypes';

export const AUTO_REFRESH_INTERVAL_MS = DEFAULT_AUTO_REFRESH_MS;

/** Top-level application state hook coordinating Open-Meteo telemetry, presets, and AI slots. */
export function useAirQualityApp(): UseAirQualityAppReturn {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('intake');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [hasHouseholdProfile, setHasHouseholdProfile] = useState<boolean>(false);
  const [location, setLocationState] = useState<CityLocation>(QUICK_INDIAN_CITIES[0]);
  const [profile, setProfile] = useState<HouseholdProfile>(EMPTY_HOUSEHOLD_PROFILE);
  const [selectedSwapIds, setSelectedSwapIds] = useState<string[]>([
    'metro-carpool',
    'midday-venting',
  ]);

  const { liveData, aqiLoading, aqiError, refreshAqi } = useLiveAqiTelemetry(location);

  const currentPm25 = liveData?.current.pm2_5 ?? 0;
  const cpcb = useMemo(() => (liveData ? computeCpcbAqi(liveData.current) : null), [liveData]);
  const ventilation = useMemo(
    () =>
      liveData ? analyzeVentilationWindows(liveData.hourly24h, liveData.current.pm2_5 ?? 0) : null,
    [liveData],
  );
  const indoorMeter = useMemo(
    () => calculateIndoorMitigationImpact(currentPm25, profile),
    [currentPm25, profile],
  );
  const swapTotals = useMemo(
    () => calculateHabitSwapImpact(selectedSwapIds, profile.commuteDistanceKm, currentPm25),
    [selectedSwapIds, profile.commuteDistanceKm, currentPm25],
  );

  const indoorQ = useIndoorQuestions({ liveData, cpcb, profile, hasHouseholdProfile });
  const ai = useBreatheWiseAi({
    liveData,
    cpcb,
    ventilation,
    profile,
    hasHouseholdProfile,
    indoorMeter,
    swapTotals,
    indoorAnswers: indoorQ.indoorAnswers,
    onNavigateWorkspace: setActiveWorkspace,
  });
  const { resetAiSlots } = ai;
  const { resetIndoorQuestions } = indoorQ;

  const protectionScorePct = useMemo(() => {
    const blocks = ai.routineSlot.data?.blocks ?? [];
    if (blocks.length === 0) return 0;
    const totalWeight = blocks.reduce((s, b) => s + Math.max(1, b.protectionWeight), 0);
    const doneWeight = blocks
      .filter((b) => ai.completedBlockIds.includes(b.id))
      .reduce((s, b) => s + Math.max(1, b.protectionWeight), 0);
    return Math.round((doneWeight / totalWeight) * 100);
  }, [ai.routineSlot.data, ai.completedBlockIds]);

  const selectCity = useCallback(
    (city: CityLocation) => {
      setLocationState(city);
      resetAiSlots();
      resetIndoorQuestions();
    },
    [resetAiSlots, resetIndoorQuestions],
  );

  const selectSampleProfile = useCallback(
    (preset: EvaluatorSampleProfile) => {
      setActivePresetId(preset.id);
      setHasHouseholdProfile(true);
      setLocationState(preset.city);
      setProfile(applyRoomProfilePatch(preset.profile, {}));
      setSelectedSwapIds(preset.defaultSwapIds);
      resetAiSlots();
      resetIndoorQuestions();
    },
    [resetAiSlots, resetIndoorQuestions],
  );

  const saveCustomProfile = useCallback(
    (custom: HouseholdProfile) => {
      setActivePresetId(null);
      setHasHouseholdProfile(true);
      setProfile((prev) => applyRoomProfilePatch(prev, custom));
      resetAiSlots();
      resetIndoorQuestions();
    },
    [resetAiSlots, resetIndoorQuestions],
  );

  const clearHouseholdProfile = useCallback(() => {
    setActivePresetId(null);
    setHasHouseholdProfile(false);
    setProfile(EMPTY_HOUSEHOLD_PROFILE);
    resetAiSlots();
    resetIndoorQuestions();
  }, [resetAiSlots, resetIndoorQuestions]);

  const updateProfile = useCallback((patch: Partial<HouseholdProfile>) => {
    setProfile((prev) => applyRoomProfilePatch(prev, patch));
  }, []);

  const toggleHabitSwap = useCallback((swapId: string) => {
    setSelectedSwapIds((prev) =>
      prev.includes(swapId) ? prev.filter((id) => id !== swapId) : [...prev, swapId],
    );
  }, []);

  return {
    activeWorkspace,
    setActiveWorkspace,
    activePresetId,
    hasHouseholdProfile,
    location,
    profile,
    selectedSwapIds,
    liveData,
    cpcb,
    ventilation,
    indoorMeter,
    swapTotals,
    aqiLoading,
    aqiError,
    refreshAqi,
    protectionScorePct,
    questionsSlot: ai.questionsSlot,
    loadingMoreQuestions: ai.loadingMoreQuestions,
    answers: ai.answers,
    additionalContext: ai.additionalContext,
    setAdditionalContext: ai.setAdditionalContext,
    setAnswer: ai.setAnswer,
    runClarifyingQuestions: ai.runClarifyingQuestions,
    askTwoMoreQuestions: ai.askTwoMoreQuestions,
    routineSlot: ai.routineSlot,
    completedBlockIds: ai.completedBlockIds,
    appliedShockNote: ai.appliedShockNote,
    appliedShockPatches: ai.appliedShockPatches,
    toggleRoutineBlock: ai.toggleRoutineBlock,
    runDailyRoutine: ai.runDailyRoutine,
    indoorSlot: ai.indoorSlot,
    runIndoorProtocol: ai.runIndoorProtocol,
    indoorQuestions: indoorQ.indoorQuestions,
    indoorAnswers: indoorQ.indoorAnswers,
    loadingMoreIndoorQuestions: indoorQ.loadingMoreIndoorQuestions,
    moreIndoorQuestionsError: indoorQ.moreIndoorQuestionsError,
    setIndoorAnswer: indoorQ.setIndoorAnswer,
    askTwoMoreIndoorQuestions: indoorQ.askTwoMoreIndoorQuestions,
    shockSlot: ai.shockSlot,
    runSmogShock: ai.runSmogShock,
    applyShockStrategy: ai.applyShockStrategy,
    communitySlot: ai.communitySlot,
    runCommunityBriefing: ai.runCommunityBriefing,
    selectCity,
    selectSampleProfile,
    saveCustomProfile,
    clearHouseholdProfile,
    updateProfile,
    toggleHabitSwap,
  };
}
