import type { ApiResponseLike } from '../src/services/aiController';

export interface MockRes extends ApiResponseLike {
  statusCode: number;
  headers: Record<string, string | string[]>;
  jsonBody: unknown;
  chunks: string[];
}

export function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    jsonBody: undefined,
    chunks: [],
    writableEnded: false,
    setHeader(name: string, value: string | string[]) {
      res.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.jsonBody = payload;
      res.writableEnded = true;
    },
    write(chunk: string) {
      res.chunks.push(chunk);
      return true;
    },
    end() {
      res.writableEnded = true;
    },
    flushHeaders() {},
  };
  return res;
}

export const VALID_PROFILE = {
  profileName: 'Delhi Commuter',
  personaSummary: 'Apartment flat',
  commuteDistanceKm: 18,
  commuteMode: 'metro' as const,
  cookingFuel: 'png_gas' as const,
  hasPurifier: true,
  hasKitchenExhaust: true,
  hasCrossVentilation: true,
  roomCount: 2,
  activeRoomCount: 2,
  vulnerableMembers: 'None',
};

export const VALID_QUESTIONS_REQ = {
  city: 'Delhi',
  aqi: 280,
  category: 'Poor',
  dominant: 'PM2.5',
  pm25: 112,
  hasHouseholdProfile: true,
};

export const MOCK_GEMINI_RESPONSES = {
  questions: {
    airContextNote: 'Delhi AQI 280.',
    questions: [
      { id: 'q1', question: 'Metro?', reason: 'Clean.', quickOptions: ['Yes', 'No', 'WFH'] },
    ],
  },
  routine: {
    routineHeadline: 'Delhi Routine',
    blocks: [
      {
        id: 'b1',
        timeBlock: 'Morning',
        timeRange: '7–10 AM',
        title: 'Seal',
        recommendedAction: 'Close',
        whyThisMatters: 'Lowers PM2.5',
        protectionWeight: 100,
        gearOrPrep: 'N95',
      },
    ],
    dailySummaryNote: 'Grounded.',
  },
  indoor: {
    protocolHeadline: 'Indoor Plan',
    rooms: [
      { room: 'Living Room', priorityLevel: 'Critical', hacks: ['Seal door'], costTier: '₹0' },
    ],
    plantRealityCheck: 'Supplement only.',
    budgetTip: 'Foam tape.',
  },
  shock: {
    shockScenario: 'Power Cut',
    severityAssessment: 'High',
    strategies: [
      {
        id: 's1',
        title: 'Seal room',
        targetTimeBlock: 'Night',
        immediateAction: 'Consolidate',
        healthAndEmissionImpact: '-35%',
        updatedRoutineTitle: 'Clean Room',
      },
    ],
  },
  community: {
    executiveSnapshot: 'Snap',
    whatsappAdvisory: 'WA',
    rwaNotice: 'RWA',
    carpoolPitch: 'Pool',
  },
};
