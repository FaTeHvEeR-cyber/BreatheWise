import { useCallback, useMemo, useState } from 'react';
import type {
  ClarifyingQuestion,
  CpcbAqiResult,
  HouseholdProfile,
  LiveAirQualityData,
} from '../types';
import { callClarifyingQuestions } from '../services/aiClient';
import { buildClarifyingQuestionsPayload } from '../utils/aiPayloads';
import {
  buildExtraFallbackQuestions,
  buildInitialIndoorQuestions,
  mergeUniqueQuestions,
} from '../utils/indoorQuestions';

import type { UseIndoorQuestionsReturn } from './hookTypes';

interface UseIndoorQuestionsParams {
  readonly liveData: LiveAirQualityData | null;
  readonly cpcb: CpcbAqiResult | null;
  readonly profile: HouseholdProfile;
  readonly hasHouseholdProfile: boolean;
}

/** Manages tailored indoor air-quality setup questions and "+2 more" expansion. */
export function useIndoorQuestions({
  liveData,
  cpcb,
  profile,
  hasHouseholdProfile,
}: UseIndoorQuestionsParams): UseIndoorQuestionsReturn {
  const baseQuestions = useMemo(
    () => buildInitialIndoorQuestions(profile, hasHouseholdProfile),
    [profile, hasHouseholdProfile],
  );

  const [extraQuestions, setExtraQuestions] = useState<ClarifyingQuestion[]>([]);
  const [indoorAnswers, setIndoorAnswers] = useState<Record<string, string>>({});
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const indoorQuestions = useMemo(
    () => mergeUniqueQuestions(baseQuestions, extraQuestions, extraQuestions.length),
    [baseQuestions, extraQuestions],
  );

  const setIndoorAnswer = useCallback((questionId: string, value: string) => {
    setIndoorAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const resetIndoorQuestions = useCallback(() => {
    setExtraQuestions([]);
    setIndoorAnswers({});
    setMoreError(null);
  }, []);

  const askTwoMoreIndoorQuestions = useCallback(async () => {
    if (!liveData || !cpcb) return;
    setLoadingMore(true);
    setMoreError(null);
    const existingList = indoorQuestions.map((q) => q.question);

    try {
      const payload = {
        ...buildClarifyingQuestionsPayload(liveData, cpcb, profile, hasHouseholdProfile, null),
        requestedCount: 2,
        focus: 'indoor',
        existingQuestions: existingList,
      };
      const res = await callClarifyingQuestions(payload);
      const next = mergeUniqueQuestions(indoorQuestions, res.questions, 2).slice(
        baseQuestions.length,
      );
      setExtraQuestions(next);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gemini unavailable.';
      setMoreError(msg);
      const fallback = buildExtraFallbackQuestions(indoorQuestions.length, 'indoor');
      const next = mergeUniqueQuestions(indoorQuestions, fallback, 2).slice(baseQuestions.length);
      setExtraQuestions(next);
    } finally {
      setLoadingMore(false);
    }
  }, [liveData, cpcb, profile, hasHouseholdProfile, indoorQuestions, baseQuestions.length]);

  return {
    indoorQuestions,
    indoorAnswers,
    loadingMoreIndoorQuestions: loadingMore,
    moreIndoorQuestionsError: moreError,
    setIndoorAnswer,
    askTwoMoreIndoorQuestions,
    resetIndoorQuestions,
  };
}
