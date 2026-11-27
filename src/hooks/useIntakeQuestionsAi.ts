import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
  ClarifyingQuestionsResponse,
  CpcbAqiResult,
  HouseholdProfile,
  LiveAirQualityData,
} from '../types';
import { callClarifyingQuestions, streamClarifyingQuestionsClient } from '../services/aiClient';
import { buildClarifyingQuestionsPayload } from '../utils/aiPayloads';
import { buildFallbackQuestions } from '../utils/fallbackAdvisor';
import { buildExtraFallbackQuestions, mergeUniqueQuestions } from '../utils/indoorQuestions';

import { EMPTY_SLOT, type AsyncSlot, type UseIntakeQuestionsReturn } from './hookTypes';

export { EMPTY_SLOT, type AsyncSlot };

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError';
}

interface UseIntakeQuestionsParams {
  readonly liveData: LiveAirQualityData | null;
  readonly cpcb: CpcbAqiResult | null;
  readonly profile: HouseholdProfile;
  readonly hasHouseholdProfile: boolean;
  readonly trimmedNotes: string | null;
  readonly ctxVersionRef: RefObject<number>;
}

/** Manages streaming intake clarifying questions, quick answers, and "+2 more" expansion. */
export function useIntakeQuestionsAi({
  liveData,
  cpcb,
  profile,
  hasHouseholdProfile,
  trimmedNotes,
  ctxVersionRef,
}: UseIntakeQuestionsParams): UseIntakeQuestionsReturn {
  const [questionsSlot, setQuestionsSlot] = useState<AsyncSlot<ClarifyingQuestionsResponse>>({
    ...EMPTY_SLOT,
  });
  const [loadingMoreQuestions, setLoadingMoreQuestions] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questionsAbortRef = useRef<AbortController | null>(null);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const resetIntakeQuestions = useCallback(() => {
    questionsAbortRef.current?.abort();
    questionsAbortRef.current = null;
    setQuestionsSlot({ ...EMPTY_SLOT });
    setLoadingMoreQuestions(false);
    setAnswers({});
  }, []);

  const runClarifyingQuestions = useCallback(async () => {
    if (!liveData || !cpcb) return;
    questionsAbortRef.current?.abort();
    const controller = new AbortController();
    questionsAbortRef.current = controller;

    const ver = ctxVersionRef.current;
    setQuestionsSlot({ data: null, loading: true, error: null });
    const payload = buildClarifyingQuestionsPayload(
      liveData,
      cpcb,
      profile,
      hasHouseholdProfile,
      trimmedNotes,
    );

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
      setQuestionsSlot({
        data: buildFallbackQuestions(liveData, cpcb, profile),
        loading: false,
        error: msg,
      });
    }
  }, [liveData, cpcb, profile, hasHouseholdProfile, trimmedNotes, ctxVersionRef]);

  const askTwoMoreQuestions = useCallback(async () => {
    if (!liveData || !cpcb || !questionsSlot.data) return;
    const ver = ctxVersionRef.current;
    setLoadingMoreQuestions(true);
    const existing = questionsSlot.data.questions;
    const payload = {
      ...buildClarifyingQuestionsPayload(
        liveData,
        cpcb,
        profile,
        hasHouseholdProfile,
        trimmedNotes,
      ),
      requestedCount: 2,
      existingQuestions: existing.map((q) => q.question),
    };
    try {
      const res = await callClarifyingQuestions(payload);
      if (ctxVersionRef.current !== ver) return;
      setQuestionsSlot((prev) =>
        prev.data
          ? {
              ...prev,
              data: {
                ...prev.data,
                questions: mergeUniqueQuestions(prev.data.questions, res.questions, 2),
              },
            }
          : prev,
      );
    } catch {
      if (ctxVersionRef.current !== ver) return;
      const extra = buildExtraFallbackQuestions(existing.length, 'intake');
      setQuestionsSlot((prev) =>
        prev.data
          ? {
              ...prev,
              data: {
                ...prev.data,
                questions: mergeUniqueQuestions(prev.data.questions, extra, 2),
              },
            }
          : prev,
      );
    } finally {
      if (ctxVersionRef.current === ver) setLoadingMoreQuestions(false);
    }
  }, [
    liveData,
    cpcb,
    profile,
    hasHouseholdProfile,
    trimmedNotes,
    questionsSlot.data,
    ctxVersionRef,
  ]);

  return {
    questionsSlot,
    loadingMoreQuestions,
    answers,
    setAnswer,
    runClarifyingQuestions,
    askTwoMoreQuestions,
    resetIntakeQuestions,
  };
}
