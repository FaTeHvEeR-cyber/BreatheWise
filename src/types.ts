export type WorkspaceId = 'intake' | 'routine' | 'indoor' | 'simulator' | 'community';

export type PollutantKey = 'pm2_5' | 'pm10' | 'nitrogen_dioxide' | 'ozone' | 'sulphur_dioxide';

export type CpcbCategoryName =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type CookingFuel = 'lpg_gas' | 'png_gas' | 'induction';
export type CommuteMode = 'petrol_car' | 'metro' | 'two_wheeler' | 'bus_auto' | 'walk_cycle' | 'hybrid_wfh';
export type TimeSlotName = 'Morning' | 'Midday' | 'Evening' | 'Night';

export interface CityLocation {
  id: string;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface RawPollutantReadings {
  pm2_5: number | null;
  pm10: number | null;
  nitrogen_dioxide: number | null;
  ozone: number | null;
  sulphur_dioxide: number | null;
  us_aqi: number | null;
}

export interface HourlyForecastPoint {
  isoTime: string;
  hourLabel: string;
  pm2_5: number;
  pm10: number | null;
  us_aqi: number | null;
  cpcbPm25SubIndex: number;
}

export interface LiveAirQualityData {
  location: CityLocation;
  sourceName: 'Open-Meteo Air Quality API';
  sourceUrl: string;
  readingIsoTime: string;
  fetchedAtIso: string;
  current: RawPollutantReadings;
  hourly24h: HourlyForecastPoint[];
}

export interface PollutantSubIndex {
  key: PollutantKey;
  label: string;
  symbol: string;
  unit: string;
  concentration: number | null;
  subIndex: number | null;
  whoGuideline: number;
  whoRatio: number | null;
}

export interface CpcbCategoryMeta {
  name: CpcbCategoryName;
  rangeLabel: string;
  minAqi: number;
  maxAqi: number;
  textColorClass: string;
  surfaceClass: string;
  borderClass: string;
  barColorHex: string;
  healthImpact: string;
}

export interface CpcbAqiResult {
  aqi: number;
  category: CpcbCategoryMeta;
  dominantPollutant: PollutantSubIndex | null;
  subIndices: PollutantSubIndex[];
}

export interface HouseholdProfile {
  profileName: string;
  personaSummary: string;
  commuteDistanceKm: number;
  commuteMode: CommuteMode;
  cookingFuel: CookingFuel;
  hasPurifier: boolean;
  hasKitchenExhaust: boolean;
  hasCrossVentilation: boolean;
  roomCount: number;
  activeRoomCount?: number;
  vulnerableMembers: string;
}

export interface EvaluatorSampleProfile {
  id: string;
  title: string;
  subtitle: string;
  city: CityLocation;
  profile: HouseholdProfile;
  defaultSwapIds: string[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  reason: string;
  quickOptions: string[];
}

export interface ClarifyingQuestionsResponse {
  airContextNote: string;
  questions: ClarifyingQuestion[];
  sourceMode?: 'gemini' | 'fallback';
}

export interface RoutineBlock {
  id: string;
  timeBlock: TimeSlotName;
  timeRange: string;
  title: string;
  recommendedAction: string;
  whyThisMatters: string;
  protectionWeight: number;
  gearOrPrep: string;
}

export interface DailyRoutineResponse {
  routineHeadline: string;
  blocks: RoutineBlock[];
  dailySummaryNote: string;
  sourceMode?: 'gemini' | 'fallback';
}

export interface RoomMitigationPlan {
  room: 'Living Room' | 'Bedroom / Nursery' | 'Kitchen';
  priorityLevel: 'Critical' | 'High' | 'Moderate';
  hacks: string[];
  costTier: string;
}

export interface IndoorProtocolResponse {
  protocolHeadline: string;
  rooms: RoomMitigationPlan[];
  plantRealityCheck: string;
  budgetTip: string;
  sourceMode?: 'gemini' | 'fallback';
}

export interface HabitSwapSpec {
  id: string;
  currentHabit: string;
  sustainableSwap: string;
  category: 'Commute' | 'Ventilation' | 'Kitchen' | 'Errands' | 'Cleaning';
  weeklyCo2KgBase: number;
  pm25ReductionPct: number;
  monthlyRupeesBase: number;
  scalesWithCommuteKm: boolean;
  mechanismNote: string;
}

export interface SmogShockStrategy {
  id: string;
  title: string;
  targetTimeBlock: TimeSlotName;
  immediateAction: string;
  healthAndEmissionImpact: string;
  updatedRoutineTitle: string;
}

export interface SmogShockResponse {
  shockScenario: string;
  severityAssessment: string;
  strategies: SmogShockStrategy[];
  sourceMode?: 'gemini' | 'fallback';
}

export interface AppliedShockPatch {
  strategyId: string;
  scenario: string;
  title: string;
  targetTimeBlock: TimeSlotName;
}

export interface CommunityBriefingResponse {
  executiveSnapshot: string;
  whatsappAdvisory: string;
  rwaNotice: string;
  carpoolPitch: string;
  sourceMode?: 'gemini' | 'fallback';
}
