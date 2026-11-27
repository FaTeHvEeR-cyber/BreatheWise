import { useCallback, useRef, useState } from 'react';
import type {
  AppliedShockPatch, ClarifyingQuestionsResponse, CommunityBriefingResponse,
  CpcbAqiResult, DailyRoutineResponse, HouseholdProfile, IndoorProtocolResponse,
  LiveAirQualityData, SmogShockResponse, SmogShockStrategy, WorkspaceId,
} from '../types';
import type { HabitSwapTotals, IndoorMitigationMeter } from '../utils/emissionsCalculator';
import type { VentilationAnalysis } from '../utils/ventilationWindows';
import {
  callClarifyingQuestions, callCommunityBriefing, callDailyRoutine,
  callIndoorProtocol, callSmogShock, streamClarifyingQuestionsClient,
} from '../services/aiClient';
import {
  buildClarifyingQuestionsPayload, buildCommunityBriefingPayload, buildDailyRoutinePayload,
  buildIndoorProtocolPayload, buildSmogShockPayload,
} from '../utils/aiPayloads';
import {
  buildFallbackCommunityBriefing, buildFallbackIndoorProtocol, buildFallbackQuestions,
  buildFallbackRoutine, buildFallbackShockStrategies,
} from '../utils/fallbackAdvisor';
import {
  buildExtraFallbackQuestions, mergeUniqueQuestions, upsertAppliedShockPatch,
} from '../utils/indoorQuestions';

export interface AsyncSlot<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_SLOT = { data: null, loading: false, error: null } as const;

interface UseBreatheWiseAiParams {
  liveData: LiveAirQualityData | null;
  cpcb: CpcbAqiResult | null;
  ventilation: VentilationAnalysis | null;
  profile: HouseholdProfile;
  hasHouseholdProfile: boolean;
  indoorMeter: IndoorMitigationMeter;
  swapTotals: HabitSwapTotals;
  indoorAnswers: Record<string, string>;
  onNavigateWorkspace: (ws: WorkspaceId) => void;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError';
}

export function useBreatheWiseAi({
  liveData, cpcb, ventilation, profile, hasHouseholdProfile,
  indoorMeter, swapTotals, indoorAnswers, onNavigateWorkspace,
}: UseBreatheWiseAiParams) {
  const [questionsSlot, setQuestionsSlot] = useState<AsyncSlot<ClarifyingQuestionsResponse>>({ ...EMPTY_SLOT });
  const [loadingMoreQuestions, setLoadingMoreQuestions] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [additionalContext, setAdditionalContext] = useState<string>('');
  const [routineSlot, setRoutineSlot] = useState<AsyncSlot<DailyRoutineResponse>>({ ...EMPTY_SLOT });
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);
  const [appliedShockNote, setAppliedShockNote] = useState<string | null>(null);
  const [appliedShockPatches, setAppliedShockPatches] = useState<AppliedShockPatch[]>([]);
  const [indoorSlot, setIndoorSlot] = useState<AsyncSlot<IndoorProtocolResponse>>({ ...EMPTY_SLOT });
  const [shockSlot, setShockSlot] = useState<AsyncSlot<SmogShockResponse>>({ ...EMPTY_SLOT });
  const [communitySlot, setCommunitySlot] = useState<AsyncSlot<CommunityBriefingResponse>>({ ...EMPTY_SLOT });

  const ctxVersionRef = useRef<number>(0);
  const questionsAbortRef = useRef<AbortController | null>(null);

  const runVersionedSlot = useCallback(async <T,>(
    setter: (next: AsyncSlot<T>) => void,
    task: () => Promise<T>,
    fallback: () => T,
  ) => {
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
  }, []);

  const resetAiSlots = useCallback(() => {
    ctxVersionRef.current += 1;
    questionsAbortRef.current?.abort();
    questionsAbortRef.current = null;
    setQuestionsSlot({ ...EMPTY_SLOT });
    setLoadingMoreQuestions(false);
    setAnswers({});
    setRoutineSlot({ ...EMPTY_SLOT });
    setCompletedBlockIds([]);
    setAppliedShockNote(null);
    setAppliedShockPatches([]);
    setIndoorSlot({ ...EMPTY_SLOT });
    setShockSlot({ ...EMPTY_SLOT });
    setCommunitySlot({ ...EMPTY_SLOT });
  }, []);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const toggleRoutineBlock = useCallback((blockId: string) => {
    setCompletedBlockIds((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId],
    );
  }, []);

  const trimmedNotes = additionalContext.trim() || null;

  const runClarifyingQuestions = useCallback(async () => {
    if (!liveData || !cpcb) return;
    questionsAbortRef.current?.abort();
    const controller = new AbortController();
    questionsAbortRef.current = controller;

    const ver = ctxVersionRef.current;
    setQuestionsSlot({ data: null, loading: true, error: null });
    const payload = buildClarifyingQuestionsPayload(liveData, cpcb, profile, hasHouseholdProfile, trimmedNotes);

    try {
      const finalRes = await streamClarifyingQuestionsClient(
        payload,
        (partial) => {
          if (ctxVersionRef.current === ver && !controller.signal.aborted) {
            setQuestionsSlot({ data: partial, loading: true, error: null });
          }
        },
        controller.signal,
      );
      if (ctxVersionRef.current === ver && !controller.signal.aborted) {
        setQuestionsSlot({ data: finalRes, loading: false, error: null });
      }
    } catch (err: unknown) {
      if (isAbortError(err) || controller.signal.aborted || ctxVersionRef.current !== ver) return;
      const msg = err instanceof Error ? err.message : 'Gemini unavailable.';
      setQuestionsSlot({ data: buildFallbackQuestions(liveData, cpcb, profile), loading: false, error: msg });
    }
  }, [liveData, cpcb, profile, hasHouseholdProfile, trimmedNotes]);

  const askTwoMoreQuestions = useCallback(async () => {
    if (!liveData || !cpcb || !questionsSlot.data) return;
    const ver = ctxVersionRef.current;
    setLoadingMoreQuestions(true);
    const existing = questionsSlot.data.questions;
    const payload = {
      ...buildClarifyingQuestionsPayload(liveData, cpcb, profile, hasHouseholdProfile, trimmedNotes),
      requestedCount: 2,
      existingQuestions: existing.map((q) => q.question),
    };
    try {
      const res = await callClarifyingQuestions(payload);
      if (ctxVersionRef.current !== ver) return;
      setQuestionsSlot((prev) =>
        prev.data
          ? { ...prev, data: { ...prev.data, questions: mergeUniqueQuestions(prev.data.questions, res.questions, 2) } }
          : prev,
      );
    } catch {
      if (ctxVersionRef.current !== ver) return;
      const extra = buildExtraFallbackQuestions(existing.length, 'intake');
      setQuestionsSlot((prev) =>
        prev.data
          ? { ...prev, data: { ...prev.data, questions: mergeUniqueQuestions(prev.data.questions, extra, 2) } }
          : prev,
      );
    } finally {
      if (ctxVersionRef.current === ver) setLoadingMoreQuestions(false);
    }
  }, [liveData, cpcb, profile, hasHouseholdProfile, trimmedNotes, questionsSlot.data]);

  const runDailyRoutine = useCallback(async () => {
    if (!liveData || !cpcb || !ventilation) return;
    setCompletedBlockIds([]);
    setAppliedShockNote(null);
    setAppliedShockPatches([]);
    await runVersionedSlot(
      setRoutineSlot,
      () => callDailyRoutine(buildDailyRoutinePayload(liveData, cpcb, ventilation, profile, hasHouseholdProfile, answers, trimmedNotes)),
      () => buildFallbackRoutine(liveData, cpcb, profile, ventilation),
    );
  }, [liveData, cpcb, ventilation, profile, hasHouseholdProfile, answers, trimmedNotes, runVersionedSlot]);

  const runIndoorProtocol = useCallback(async () => {
    if (!liveData || !cpcb) return;
    await runVersionedSlot(
      setIndoorSlot,
      () => callIndoorProtocol(buildIndoorProtocolPayload(liveData, cpcb, profile, hasHouseholdProfile, indoorMeter, trimmedNotes, indoorAnswers)),
      () => buildFallbackIndoorProtocol(liveData, cpcb, profile),
    );
  }, [liveData, cpcb, profile, hasHouseholdProfile, indoorMeter, trimmedNotes, indoorAnswers, runVersionedSlot]);

  const runSmogShock = useCallback(async (shockScenario: string) => {
    if (!liveData || !cpcb) return;
    await runVersionedSlot(
      setShockSlot,
      () => callSmogShock(buildSmogShockPayload(shockScenario, liveData, cpcb, profile, hasHouseholdProfile, routineSlot.data?.routineHeadline ?? null)),
      () => buildFallbackShockStrategies(shockScenario, liveData, cpcb),
    );
  }, [liveData, cpcb, profile, hasHouseholdProfile, routineSlot.data, runVersionedSlot]);

  const applyShockStrategy = useCallback((strategy: SmogShockStrategy) => {
    if (!liveData || !cpcb || !ventilation) return;
    const scenario = shockSlot.data?.shockScenario ?? 'Smog shock';
    setRoutineSlot((prev) => {
      const base = prev.data ?? buildFallbackRoutine(liveData, cpcb, profile, ventilation);
      const updatedBlocks = base.blocks.map((blk) =>
        blk.timeBlock === strategy.targetTimeBlock
          ? { ...blk, title: strategy.updatedRoutineTitle, recommendedAction: strategy.immediateAction, whyThisMatters: strategy.healthAndEmissionImpact }
          : blk,
      );
      return { ...prev, data: { ...base, blocks: updatedBlocks } };
    });
    setAppliedShockPatches((prev) => upsertAppliedShockPatch(prev, scenario, strategy));
    setAppliedShockNote(`Applied "${strategy.title}" to your ${strategy.targetTimeBlock} routine block.`);
    onNavigateWorkspace('routine');
  }, [liveData, cpcb, ventilation, profile, shockSlot.data?.shockScenario, onNavigateWorkspace]);

  const runCommunityBriefing = useCallback(async () => {
    if (!liveData || !cpcb || !ventilation) return;
    await runVersionedSlot(
      setCommunitySlot,
      () => callCommunityBriefing(buildCommunityBriefingPayload(liveData, cpcb, ventilation, profile, hasHouseholdProfile, swapTotals, routineSlot.data?.routineHeadline ?? null)),
      () => buildFallbackCommunityBriefing(liveData, cpcb, profile, ventilation, swapTotals),
    );
  }, [liveData, cpcb, ventilation, profile, hasHouseholdProfile, swapTotals, routineSlot.data, runVersionedSlot]);

  return {
    questionsSlot, loadingMoreQuestions, answers, additionalContext, setAdditionalContext, setAnswer,
    runClarifyingQuestions, askTwoMoreQuestions,
    routineSlot, completedBlockIds, appliedShockNote, appliedShockPatches, toggleRoutineBlock, runDailyRoutine,
    indoorSlot, runIndoorProtocol,
    shockSlot, runSmogShock, applyShockStrategy,
    communitySlot, runCommunityBriefing,
    resetAiSlots,
  };
}
