import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CityLocation,
  EvaluatorSampleProfile,
  HouseholdProfile,
  LiveAirQualityData,
  WorkspaceId,
} from '../types';
import { EMPTY_HOUSEHOLD_PROFILE, QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';
import { fetchLiveCityAirQuality } from '../services/aqiService';
import { computeCpcbAqi } from '../utils/cpcbAqi';
import { analyzeVentilationWindows } from '../utils/ventilationWindows';
import {
  calculateHabitSwapImpact,
  calculateIndoorMitigationImpact,
} from '../utils/emissionsCalculator';
import { DEFAULT_AUTO_REFRESH_MS, shouldAutoRefresh } from '../utils/timeFormatting';
import { applyRoomProfilePatch } from '../utils/numericInput';
import { useBreatheWiseAi } from './useBreatheWiseAi';
import { useIndoorQuestions } from './useIndoorQuestions';

export type { AsyncSlot } from './useBreatheWiseAi';

export const AUTO_REFRESH_INTERVAL_MS = DEFAULT_AUTO_REFRESH_MS;

/** Top-level application state hook coordinating Open-Meteo telemetry, presets, and AI slots. */
export function useAirQualityApp() {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('intake');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [hasHouseholdProfile, setHasHouseholdProfile] = useState<boolean>(false);
  const [location, setLocationState] = useState<CityLocation>(QUICK_INDIAN_CITIES[0]);
  const [profile, setProfile] = useState<HouseholdProfile>(EMPTY_HOUSEHOLD_PROFILE);
  const [selectedSwapIds, setSelectedSwapIds] = useState<string[]>([
    'metro-carpool',
    'midday-venting',
  ]);

  const [liveData, setLiveData] = useState<LiveAirQualityData | null>(null);
  const [aqiLoading, setAqiLoading] = useState<boolean>(true);
  const [aqiError, setAqiError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchedAtMsRef = useRef<number | null>(null);

  const refreshAqi = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    isFetchingRef.current = true;
    setLiveData((prev) => (prev && prev.location.id === location.id ? prev : null));
    setAqiLoading(true);
    setAqiError(null);

    fetchLiveCityAirQuality(location, controller.signal)
      .then((fetched) => {
        if (!controller.signal.aborted) {
          isFetchingRef.current = false;
          lastFetchedAtMsRef.current = Date.now();
          setLiveData(fetched);
          setAqiLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        isFetchingRef.current = false;
        setAqiError(err instanceof Error ? err.message : 'Unable to load Open-Meteo telemetry.');
        setAqiLoading(false);
      });

    return () => {
      isFetchingRef.current = false;
      controller.abort();
    };
  }, [location, refreshTick]);

  // Automatic 5-minute interval timer + stale-tab wakeup refresh without wiping current UI
  useEffect(() => {
    const triggerAutoRefresh = () => {
      if (!isFetchingRef.current) {
        refreshAqi();
      }
    };

    const intervalId = window.setInterval(triggerAutoRefresh, AUTO_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        shouldAutoRefresh(lastFetchedAtMsRef.current, Date.now(), AUTO_REFRESH_INTERVAL_MS)
      ) {
        triggerAutoRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location, refreshAqi]);

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

  const indoorQ = useIndoorQuestions({
    liveData,
    cpcb,
    profile,
    hasHouseholdProfile,
  });

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
