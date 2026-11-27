import { z } from 'zod';

export const MAX_API_BODY_BYTES = 128 * 1024;

export type AiActionName =
  | 'clarifyingQuestions'
  | 'dailyRoutine'
  | 'indoorProtocol'
  | 'smogShock'
  | 'communityBriefing';

const CityNameSchema = z.string().trim().min(1).max(120);
const AqiSchema = z.number().finite().min(0).max(500);
const NonNegNullable = z.number().finite().min(0).max(5000).nullable();
const TimeSlotSchema = z.enum(['Morning', 'Midday', 'Evening', 'Night']);
const SourceFields = {
  source: z.string().min(1).max(80).optional(),
  sourceMode: z.enum(['gemini', 'fallback']).optional(),
};

const HouseholdProfileSchema = z.object({
  profileName: z.string().max(160),
  personaSummary: z.string().max(500),
  commuteDistanceKm: z.number().finite().min(0).max(300),
  commuteMode: z.enum(['petrol_car', 'metro', 'two_wheeler', 'bus_auto', 'walk_cycle', 'hybrid_wfh']),
  cookingFuel: z.enum(['lpg_gas', 'png_gas', 'induction']),
  hasPurifier: z.boolean(),
  hasKitchenExhaust: z.boolean(),
  hasCrossVentilation: z.boolean(),
  roomCount: z.number().int().min(1).max(30),
  activeRoomCount: z.number().int().min(1).max(30).optional(),
  vulnerableMembers: z.string().max(300),
});

const TimeWindowBandSchema = z.object({
  startHourLabel: z.string().min(1).max(40),
  endHourLabel: z.string().min(1).max(40),
  startIndex: z.number().int().min(0).max(48),
  endIndex: z.number().int().min(0).max(48),
  avgPm25: z.number().finite().min(0).max(2000),
  peakPm25: z.number().finite().min(0).max(2000),
  minPm25: z.number().finite().min(0).max(2000),
  verdict: z.enum(['Open Windows', 'Brief Purge', 'Keep Sealed']),
});

const RawPollutantReadingsSchema = z.object({
  pm2_5: NonNegNullable,
  pm10: NonNegNullable,
  nitrogen_dioxide: NonNegNullable,
  ozone: NonNegNullable,
  sulphur_dioxide: NonNegNullable,
  us_aqi: NonNegNullable,
});

export const ClarifyingQuestionsRequestSchema = z.object({
  city: CityNameSchema,
  aqi: AqiSchema,
  category: z.string().trim().min(1).max(60),
  dominant: z.string().trim().min(1).max(40),
  pm25: NonNegNullable,
  hasHouseholdProfile: z.boolean(),
  household: z.string().max(600).optional(),
  notes: z.string().max(1500).nullable().optional(),
  requestedCount: z.union([z.literal(2), z.literal(3)]).optional(),
  focus: z.enum(['intake', 'indoor']).optional(),
  existingQuestions: z.array(z.string().max(300)).max(15).optional(),
});

export const ClarifyingQuestionsResponseSchema = z.object({
  airContextNote: z.string().min(1),
  questions: z.array(
    z.object({
      id: z.string().min(1),
      question: z.string().min(1),
      reason: z.string().min(1),
      quickOptions: z.array(z.string().min(1)).min(1).max(6),
    }),
  ).min(1).max(6),
  ...SourceFields,
});

export const DailyRoutineRequestSchema = z.object({
  city: CityNameSchema,
  readingIsoTime: z.string().min(1).max(60),
  cpcbAqi: AqiSchema,
  cpcbCategory: z.string().trim().min(1).max(60),
  currentPollutants: RawPollutantReadingsSchema,
  bestWindow: TimeWindowBandSchema.nullable(),
  worstWindow: TimeWindowBandSchema.nullable(),
  hasHouseholdProfile: z.boolean(),
  profile: HouseholdProfileSchema.nullable(),
  clarifyingAnswers: z.record(z.string().max(100), z.string().max(500)),
  additionalContext: z.string().max(1500).nullable(),
});

export const DailyRoutineResponseSchema = z.object({
  routineHeadline: z.string().min(1),
  blocks: z.array(
    z.object({
      id: z.string().min(1),
      timeBlock: TimeSlotSchema,
      timeRange: z.string().min(1),
      title: z.string().min(1),
      recommendedAction: z.string().min(1),
      whyThisMatters: z.string().min(1),
      protectionWeight: z.number().finite().min(0).max(100),
      gearOrPrep: z.string().min(1),
    }),
  ).min(1).max(6),
  dailySummaryNote: z.string().min(1),
  ...SourceFields,
});

export const IndoorProtocolRequestSchema = z.object({
  city: CityNameSchema,
  cpcbAqi: AqiSchema,
  cpcbCategory: z.string().trim().min(1).max(60),
  outdoorPm25: NonNegNullable,
  hasHouseholdProfile: z.boolean(),
  profile: HouseholdProfileSchema,
  indoorMeter: z.object({
    outdoorPm25: z.number().finite().min(0).max(2000),
    beforePm25: z.number().finite().min(0).max(2000),
    afterPm25: z.number().finite().min(0).max(2000),
    reductionPercent: z.number().finite().min(0).max(100),
    appliedMeasures: z.array(z.string().max(250)).max(20),
  }),
  additionalContext: z.string().max(1500).nullable(),
  indoorAnswers: z.record(z.string().max(100), z.string().max(500)).optional(),
});

export const IndoorProtocolResponseSchema = z.object({
  protocolHeadline: z.string().min(1),
  rooms: z.array(
    z.object({
      room: z.enum(['Living Room', 'Bedroom / Nursery', 'Kitchen']),
      priorityLevel: z.enum(['Critical', 'High', 'Moderate']),
      hacks: z.array(z.string().min(1)).min(1).max(6),
      costTier: z.string().min(1),
    }),
  ).min(1).max(5),
  plantRealityCheck: z.string().min(1),
  budgetTip: z.string().min(1),
  ...SourceFields,
});

export const SmogShockRequestSchema = z.object({
  shockScenario: z.string().trim().min(1).max(500),
  city: CityNameSchema,
  cpcbAqi: AqiSchema,
  outdoorPm25: NonNegNullable,
  hasHouseholdProfile: z.boolean(),
  profile: HouseholdProfileSchema.nullable(),
  activeRoutineHeadline: z.string().max(300).nullable(),
});

export const SmogShockResponseSchema = z.object({
  shockScenario: z.string().min(1),
  severityAssessment: z.string().min(1),
  strategies: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      targetTimeBlock: TimeSlotSchema,
      immediateAction: z.string().min(1),
      healthAndEmissionImpact: z.string().min(1),
      updatedRoutineTitle: z.string().min(1),
    }),
  ).min(1).max(5),
  ...SourceFields,
});

export const CommunityBriefingRequestSchema = z.object({
  city: CityNameSchema,
  readingIsoTime: z.string().min(1).max(60),
  cpcbAqi: AqiSchema,
  cpcbCategory: z.string().trim().min(1).max(60),
  dominantPollutant: z.string().trim().min(1).max(40),
  outdoorPm25: NonNegNullable,
  bestWindow: TimeWindowBandSchema.nullable(),
  hasHouseholdProfile: z.boolean(),
  profile: HouseholdProfileSchema.nullable(),
  swapTotals: z.object({
    weeklyCo2KgAvoided: z.number().finite().min(0).max(5000),
    pm25ExposureReductionPct: z.number().finite().min(0).max(100),
    monthlyRupeesSaved: z.number().finite().min(0).max(1_000_000),
  }),
  routineHeadline: z.string().max(300).nullable(),
});

export const CommunityBriefingResponseSchema = z.object({
  executiveSnapshot: z.string().min(1),
  whatsappAdvisory: z.string().min(1),
  rwaNotice: z.string().min(1),
  carpoolPitch: z.string().min(1),
  ...SourceFields,
});

export const AI_ACTION_CONTRACTS = {
  clarifyingQuestions: {
    requestSchema: ClarifyingQuestionsRequestSchema,
    responseSchema: ClarifyingQuestionsResponseSchema,
  },
  dailyRoutine: {
    requestSchema: DailyRoutineRequestSchema,
    responseSchema: DailyRoutineResponseSchema,
  },
  indoorProtocol: {
    requestSchema: IndoorProtocolRequestSchema,
    responseSchema: IndoorProtocolResponseSchema,
  },
  smogShock: {
    requestSchema: SmogShockRequestSchema,
    responseSchema: SmogShockResponseSchema,
  },
  communityBriefing: {
    requestSchema: CommunityBriefingRequestSchema,
    responseSchema: CommunityBriefingResponseSchema,
  },
} as const;
