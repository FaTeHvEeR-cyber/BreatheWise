import { useCallback, useRef, useState } from 'react';
import type {
  CpcbAqiResult,
  DailyRoutineResponse,
  HouseholdProfile,
  IndoorProtocolResponse,
  LiveAirQualityData,
  WorkspaceId,
} from '../types';
import type { HabitSwapTotals, IndoorMitigationMeter } from '../utils/emissionsCalculator';
import type { VentilationAnalysis } from '../utils/ventilationWindows';
import { callDailyRoutine, callIndoorProtocol } from '../services/aiClient';
import { buildDailyRoutinePayload, buildIndoorProtocolPayload } from '../utils/aiPayloads';
import { buildFallbackIndoorProtocol, buildFallbackRoutine } from '../utils/fallbackAdvisor';
import { EMPTY_SLOT, type AsyncSlot, type UseBreatheWiseAiReturn } from './hookTypes';
import { useIntakeQuestionsAi } from './useIntakeQuestionsAi';
import { useShockAndCommunityAi } from './useShockAndCommunityAi';

export type { AsyncSlot };

interface UseBreatheWiseAiParams {
  readonly liveData: LiveAirQualityData | null;
  readonly cpcb: CpcbAqiResult | null;
  readonly ventilation: VentilationAnalysis | null;
  readonly profile: HouseholdProfile;
  readonly hasHouseholdProfile: boolean;
  readonly indoorMeter: IndoorMitigationMeter;
  readonly swapTotals: HabitSwapTotals;
  readonly indoorAnswers: Record<string, string>;
  readonly onNavigateWorkspace: (ws: WorkspaceId) => void;
}

/** Manages versioned AI request slots, streaming questions, and deterministic fallbacks. */
export function useBreatheWiseAi({
  liveData,
  cpcb,
  ventilation,
  profile,
  hasHouseholdProfile,
  indoorMeter,
  swapTotals,
  indoorAnswers,
  onNavigateWorkspace,
}: UseBreatheWiseAiParams): UseBreatheWiseAiReturn {
  const [additionalContext, setAdditionalContext] = useState<string>('');
  const [routineSlot, setRoutineSlot] = useState<AsyncSlot<DailyRoutineResponse>>({
    ...EMPTY_SLOT,
  });
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);
  const [indoorSlot, setIndoorSlot] = useState<AsyncSlot<IndoorProtocolResponse>>({
    ...EMPTY_SLOT,
  });

  const ctxVersionRef = useRef<number>(0);
  const trimmedNotes = additionalContext.trim() || null;

  const intake = useIntakeQuestionsAi({
    liveData,
    cpcb,
    profile,
    hasHouseholdProfile,
    trimmedNotes,
    ctxVersionRef,
  });

  const runVersionedSlot = useCallback(
    async <T>(setter: (next: AsyncSlot<T>) => void, task: () => Promise<T>, fallback: () => T) => {
      const ver = ctxVersionRef.current;
      setter({ data: null, loading: true, error: null });
      try {
        const res = await task();
        if (ctxVersionRef.current === ver) setter({ data: res, loading: false, error: null });
      } catch (err: unknown) {
        if (ctxVersionRef.current === ver) {
          const msg = err instanceof Error ? err.message : 'Gemini unavailable.';
          setter({ data: fallback(), loading: false, error: msg });
        }
      }
    },
    [],
  );

  const shockAndCommunity = useShockAndCommunityAi({
    liveData,
    cpcb,
    ventilation,
    profile,
    hasHouseholdProfile,
    swapTotals,
    routineHeadline: routineSlot.data?.routineHeadline ?? null,
    setRoutineSlot,
    runVersionedSlot,
    onNavigateWorkspace,
  });

  const { resetIntakeQuestions } = intake;
  const { resetShockAndCommunity, setAppliedShockNote, setAppliedShockPatches } = shockAndCommunity;

  const resetAiSlots = useCallback(() => {
    ctxVersionRef.current += 1;
    resetIntakeQuestions();
    resetShockAndCommunity();
    setRoutineSlot({ ...EMPTY_SLOT });
    setCompletedBlockIds([]);
    setIndoorSlot({ ...EMPTY_SLOT });
  }, [resetIntakeQuestions, resetShockAndCommunity]);

  const toggleRoutineBlock = useCallback((blockId: string) => {
    setCompletedBlockIds((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId],
    );
  }, []);

  const runDailyRoutine = useCallback(async () => {
    if (!liveData || !cpcb || !ventilation) return;
    setCompletedBlockIds([]);
    setAppliedShockNote(null);
    setAppliedShockPatches([]);
    await runVersionedSlot(
      setRoutineSlot,
      () =>
        callDailyRoutine(
          buildDailyRoutinePayload(
            liveData,
            cpcb,
            ventilation,
            profile,
            hasHouseholdProfile,
            intake.answers,
            trimmedNotes,
          ),
        ),
      () => buildFallbackRoutine(liveData, cpcb, profile, ventilation),
    );
  }, [
    liveData,
    cpcb,
    ventilation,
    profile,
    hasHouseholdProfile,
    intake.answers,
    trimmedNotes,
    runVersionedSlot,
    setAppliedShockNote,
    setAppliedShockPatches,
  ]);

  const runIndoorProtocol = useCallback(async () => {
    if (!liveData || !cpcb) return;
    await runVersionedSlot(
      setIndoorSlot,
      () =>
        callIndoorProtocol(
          buildIndoorProtocolPayload(
            liveData,
            cpcb,
            profile,
            hasHouseholdProfile,
            indoorMeter,
            trimmedNotes,
            indoorAnswers,
          ),
        ),
      () => buildFallbackIndoorProtocol(liveData, cpcb, profile),
    );
  }, [
    liveData,
    cpcb,
    profile,
    hasHouseholdProfile,
    indoorMeter,
    trimmedNotes,
    indoorAnswers,
    runVersionedSlot,
  ]);

  return {
    questionsSlot: intake.questionsSlot,
    loadingMoreQuestions: intake.loadingMoreQuestions,
    answers: intake.answers,
    additionalContext,
    setAdditionalContext,
    setAnswer: intake.setAnswer,
    runClarifyingQuestions: intake.runClarifyingQuestions,
    askTwoMoreQuestions: intake.askTwoMoreQuestions,
    routineSlot,
    completedBlockIds,
    appliedShockNote: shockAndCommunity.appliedShockNote,
    appliedShockPatches: shockAndCommunity.appliedShockPatches,
    toggleRoutineBlock,
    runDailyRoutine,
    indoorSlot,
    runIndoorProtocol,
    shockSlot: shockAndCommunity.shockSlot,
    runSmogShock: shockAndCommunity.runSmogShock,
    applyShockStrategy: shockAndCommunity.applyShockStrategy,
    communitySlot: shockAndCommunity.communitySlot,
    runCommunityBriefing: shockAndCommunity.runCommunityBriefing,
    resetAiSlots,
  };
}
