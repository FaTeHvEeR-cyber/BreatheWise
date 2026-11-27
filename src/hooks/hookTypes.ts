import type { Dispatch, SetStateAction } from 'react';
import type {
  AppliedShockPatch,
  CityLocation,
  ClarifyingQuestion,
  ClarifyingQuestionsResponse,
  CommunityBriefingResponse,
  CpcbAqiResult,
  DailyRoutineResponse,
  EvaluatorSampleProfile,
  HouseholdProfile,
  IndoorProtocolResponse,
  LiveAirQualityData,
  SmogShockResponse,
  SmogShockStrategy,
  WorkspaceId,
} from '../types';
import type { HabitSwapTotals, IndoorMitigationMeter } from '../utils/emissionsCalculator';
import type { VentilationAnalysis } from '../utils/ventilationWindows';

export interface AsyncSlot<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
}

export const EMPTY_SLOT: AsyncSlot<never> = { data: null, loading: false, error: null };

export interface UseIndoorQuestionsReturn {
  readonly indoorQuestions: ClarifyingQuestion[];
  readonly indoorAnswers: Record<string, string>;
  readonly loadingMoreIndoorQuestions: boolean;
  readonly moreIndoorQuestionsError: string | null;
  readonly setIndoorAnswer: (questionId: string, value: string) => void;
  readonly askTwoMoreIndoorQuestions: () => Promise<void>;
  readonly resetIndoorQuestions: () => void;
}

export interface UseIntakeQuestionsReturn {
  readonly questionsSlot: AsyncSlot<ClarifyingQuestionsResponse>;
  readonly loadingMoreQuestions: boolean;
  readonly answers: Record<string, string>;
  readonly setAnswer: (questionId: string, value: string) => void;
  readonly runClarifyingQuestions: () => Promise<void>;
  readonly askTwoMoreQuestions: () => Promise<void>;
  readonly resetIntakeQuestions: () => void;
}

export interface UseShockAndCommunityReturn {
  readonly appliedShockNote: string | null;
  readonly appliedShockPatches: AppliedShockPatch[];
  readonly shockSlot: AsyncSlot<SmogShockResponse>;
  readonly communitySlot: AsyncSlot<CommunityBriefingResponse>;
  readonly setAppliedShockNote: Dispatch<SetStateAction<string | null>>;
  readonly setAppliedShockPatches: Dispatch<SetStateAction<AppliedShockPatch[]>>;
  readonly runSmogShock: (shockScenario: string) => Promise<void>;
  readonly applyShockStrategy: (strategy: SmogShockStrategy) => void;
  readonly runCommunityBriefing: () => Promise<void>;
  readonly resetShockAndCommunity: () => void;
}

export interface UseBreatheWiseAiReturn {
  readonly questionsSlot: AsyncSlot<ClarifyingQuestionsResponse>;
  readonly loadingMoreQuestions: boolean;
  readonly answers: Record<string, string>;
  readonly additionalContext: string;
  readonly setAdditionalContext: Dispatch<SetStateAction<string>>;
  readonly setAnswer: (questionId: string, value: string) => void;
  readonly runClarifyingQuestions: () => Promise<void>;
  readonly askTwoMoreQuestions: () => Promise<void>;
  readonly routineSlot: AsyncSlot<DailyRoutineResponse>;
  readonly completedBlockIds: string[];
  readonly appliedShockNote: string | null;
  readonly appliedShockPatches: AppliedShockPatch[];
  readonly toggleRoutineBlock: (blockId: string) => void;
  readonly runDailyRoutine: () => Promise<void>;
  readonly indoorSlot: AsyncSlot<IndoorProtocolResponse>;
  readonly runIndoorProtocol: () => Promise<void>;
  readonly shockSlot: AsyncSlot<SmogShockResponse>;
  readonly runSmogShock: (shockScenario: string) => Promise<void>;
  readonly applyShockStrategy: (strategy: SmogShockStrategy) => void;
  readonly communitySlot: AsyncSlot<CommunityBriefingResponse>;
  readonly runCommunityBriefing: () => Promise<void>;
  readonly resetAiSlots: () => void;
}

export interface UseAirQualityAppReturn {
  readonly activeWorkspace: WorkspaceId;
  readonly setActiveWorkspace: Dispatch<SetStateAction<WorkspaceId>>;
  readonly activePresetId: string | null;
  readonly hasHouseholdProfile: boolean;
  readonly location: CityLocation;
  readonly profile: HouseholdProfile;
  readonly selectedSwapIds: string[];
  readonly liveData: LiveAirQualityData | null;
  readonly cpcb: CpcbAqiResult | null;
  readonly ventilation: VentilationAnalysis | null;
  readonly indoorMeter: IndoorMitigationMeter;
  readonly swapTotals: HabitSwapTotals;
  readonly aqiLoading: boolean;
  readonly aqiError: string | null;
  readonly refreshAqi: () => void;
  readonly protectionScorePct: number;
  readonly questionsSlot: AsyncSlot<ClarifyingQuestionsResponse>;
  readonly loadingMoreQuestions: boolean;
  readonly answers: Record<string, string>;
  readonly additionalContext: string;
  readonly setAdditionalContext: Dispatch<SetStateAction<string>>;
  readonly setAnswer: (questionId: string, value: string) => void;
  readonly runClarifyingQuestions: () => Promise<void>;
  readonly askTwoMoreQuestions: () => Promise<void>;
  readonly routineSlot: AsyncSlot<DailyRoutineResponse>;
  readonly completedBlockIds: string[];
  readonly appliedShockNote: string | null;
  readonly appliedShockPatches: AppliedShockPatch[];
  readonly toggleRoutineBlock: (blockId: string) => void;
  readonly runDailyRoutine: () => Promise<void>;
  readonly indoorSlot: AsyncSlot<IndoorProtocolResponse>;
  readonly runIndoorProtocol: () => Promise<void>;
  readonly indoorQuestions: ClarifyingQuestion[];
  readonly indoorAnswers: Record<string, string>;
  readonly loadingMoreIndoorQuestions: boolean;
  readonly moreIndoorQuestionsError: string | null;
  readonly setIndoorAnswer: (questionId: string, value: string) => void;
  readonly askTwoMoreIndoorQuestions: () => Promise<void>;
  readonly shockSlot: AsyncSlot<SmogShockResponse>;
  readonly runSmogShock: (shockScenario: string) => Promise<void>;
  readonly applyShockStrategy: (strategy: SmogShockStrategy) => void;
  readonly communitySlot: AsyncSlot<CommunityBriefingResponse>;
  readonly runCommunityBriefing: () => Promise<void>;
  readonly selectCity: (city: CityLocation) => void;
  readonly selectSampleProfile: (preset: EvaluatorSampleProfile) => void;
  readonly saveCustomProfile: (custom: HouseholdProfile) => void;
  readonly clearHouseholdProfile: () => void;
  readonly updateProfile: (patch: Partial<HouseholdProfile>) => void;
  readonly toggleHabitSwap: (swapId: string) => void;
}
