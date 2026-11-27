import { useCallback, useState } from 'react';
import type {
  AppliedShockPatch,
  CommunityBriefingResponse,
  CpcbAqiResult,
  DailyRoutineResponse,
  HouseholdProfile,
  LiveAirQualityData,
  SmogShockResponse,
  SmogShockStrategy,
  WorkspaceId,
} from '../types';
import type { HabitSwapTotals } from '../utils/emissionsCalculator';
import type { VentilationAnalysis } from '../utils/ventilationWindows';
import { callCommunityBriefing, callSmogShock } from '../services/aiClient';
import { buildCommunityBriefingPayload, buildSmogShockPayload } from '../utils/aiPayloads';
import {
  buildFallbackCommunityBriefing,
  buildFallbackRoutine,
  buildFallbackShockStrategies,
} from '../utils/fallbackAdvisor';
import { upsertAppliedShockPatch } from '../utils/indoorQuestions';
import { EMPTY_SLOT, type AsyncSlot } from './useIntakeQuestionsAi';

interface UseShockAndCommunityParams {
  liveData: LiveAirQualityData | null;
  cpcb: CpcbAqiResult | null;
  ventilation: VentilationAnalysis | null;
  profile: HouseholdProfile;
  hasHouseholdProfile: boolean;
  swapTotals: HabitSwapTotals;
  routineHeadline: string | null;
  setRoutineSlot: React.Dispatch<React.SetStateAction<AsyncSlot<DailyRoutineResponse>>>;
  runVersionedSlot: <T>(
    setter: (next: AsyncSlot<T>) => void,
    task: () => Promise<T>,
    fallback: () => T,
  ) => Promise<void>;
  onNavigateWorkspace: (ws: WorkspaceId) => void;
}

/** Manages smog shock simulations, routine patching, and community briefings. */
export function useShockAndCommunityAi({
  liveData,
  cpcb,
  ventilation,
  profile,
  hasHouseholdProfile,
  swapTotals,
  routineHeadline,
  setRoutineSlot,
  runVersionedSlot,
  onNavigateWorkspace,
}: UseShockAndCommunityParams) {
  const [appliedShockNote, setAppliedShockNote] = useState<string | null>(null);
  const [appliedShockPatches, setAppliedShockPatches] = useState<AppliedShockPatch[]>([]);
  const [shockSlot, setShockSlot] = useState<AsyncSlot<SmogShockResponse>>({ ...EMPTY_SLOT });
  const [communitySlot, setCommunitySlot] = useState<AsyncSlot<CommunityBriefingResponse>>({
    ...EMPTY_SLOT,
  });

  const resetShockAndCommunity = useCallback(() => {
    setAppliedShockNote(null);
    setAppliedShockPatches([]);
    setShockSlot({ ...EMPTY_SLOT });
    setCommunitySlot({ ...EMPTY_SLOT });
  }, []);

  const runSmogShock = useCallback(
    async (shockScenario: string) => {
      if (!liveData || !cpcb) return;
      await runVersionedSlot(
        setShockSlot,
        () =>
          callSmogShock(
            buildSmogShockPayload(
              shockScenario,
              liveData,
              cpcb,
              profile,
              hasHouseholdProfile,
              routineHeadline,
            ),
          ),
        () => buildFallbackShockStrategies(shockScenario, liveData, cpcb),
      );
    },
    [liveData, cpcb, profile, hasHouseholdProfile, routineHeadline, runVersionedSlot],
  );

  const applyShockStrategy = useCallback(
    (strategy: SmogShockStrategy) => {
      if (!liveData || !cpcb || !ventilation) return;
      const scenario = shockSlot.data?.shockScenario ?? 'Smog shock';
      setRoutineSlot((prev) => {
        const base = prev.data ?? buildFallbackRoutine(liveData, cpcb, profile, ventilation);
        const updatedBlocks = base.blocks.map((blk) =>
          blk.timeBlock === strategy.targetTimeBlock
            ? {
                ...blk,
                title: strategy.updatedRoutineTitle,
                recommendedAction: strategy.immediateAction,
                whyThisMatters: strategy.healthAndEmissionImpact,
              }
            : blk,
        );
        return { ...prev, data: { ...base, blocks: updatedBlocks } };
      });
      setAppliedShockPatches((prev) => upsertAppliedShockPatch(prev, scenario, strategy));
      setAppliedShockNote(
        `Applied "${strategy.title}" to your ${strategy.targetTimeBlock} routine block.`,
      );
      onNavigateWorkspace('routine');
    },
    [
      liveData,
      cpcb,
      ventilation,
      profile,
      shockSlot.data?.shockScenario,
      setRoutineSlot,
      onNavigateWorkspace,
    ],
  );

  const runCommunityBriefing = useCallback(async () => {
    if (!liveData || !cpcb || !ventilation) return;
    await runVersionedSlot(
      setCommunitySlot,
      () =>
        callCommunityBriefing(
          buildCommunityBriefingPayload(
            liveData,
            cpcb,
            ventilation,
            profile,
            hasHouseholdProfile,
            swapTotals,
            routineHeadline,
          ),
        ),
      () => buildFallbackCommunityBriefing(liveData, cpcb, profile, ventilation, swapTotals),
    );
  }, [
    liveData,
    cpcb,
    ventilation,
    profile,
    hasHouseholdProfile,
    swapTotals,
    routineHeadline,
    runVersionedSlot,
  ]);

  return {
    appliedShockNote,
    appliedShockPatches,
    shockSlot,
    communitySlot,
    setAppliedShockNote,
    setAppliedShockPatches,
    runSmogShock,
    applyShockStrategy,
    runCommunityBriefing,
    resetShockAndCommunity,
  };
}
