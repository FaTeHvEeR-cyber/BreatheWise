import { Type } from '@google/genai';
import type { Schema } from '@google/genai';

export const CLARIFYING_QUESTIONS_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['airContextNote', 'questions'],
  propertyOrdering: ['airContextNote', 'questions'],
  properties: {
    airContextNote: {
      type: Type.STRING,
      description: '1 concise sentence (<=22 words) citing exact live CPCB AQI and dominant pollutant.',
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['id', 'question', 'reason', 'quickOptions'],
        propertyOrdering: ['id', 'question', 'reason', 'quickOptions'],
        properties: {
          id: { type: Type.STRING, description: 'q1, q2, or q3' },
          question: { type: Type.STRING, description: 'Short direct question (<=14 words).' },
          reason: { type: Type.STRING, description: 'Brief 1-line rationale (<=10 words).' },
          quickOptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 short clickable options (2-5 words each).',
          },
        },
      },
      description: 'Requested number (2 or 3) of crisp clarifying questions.',
    },
  },
};

export const DAILY_ROUTINE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['routineHeadline', 'blocks', 'dailySummaryNote'],
  properties: {
    routineHeadline: { type: Type.STRING },
    blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: [
          'id',
          'timeBlock',
          'timeRange',
          'title',
          'recommendedAction',
          'whyThisMatters',
          'protectionWeight',
          'gearOrPrep',
        ],
        properties: {
          id: { type: Type.STRING },
          timeBlock: { type: Type.STRING, enum: ['Morning', 'Midday', 'Evening', 'Night'] },
          timeRange: {
            type: Type.STRING,
            description: 'Standard 12-hour clock time range (e.g., 6:30 AM – 10:30 AM).',
          },
          title: { type: Type.STRING },
          recommendedAction: { type: Type.STRING },
          whyThisMatters: {
            type: Type.STRING,
            description: 'Direct health & emission impact explanation with quantified mechanism.',
          },
          protectionWeight: {
            type: Type.INTEGER,
            description: 'Relative share of 100 daily protection points (sum of 4 blocks = 100).',
          },
          gearOrPrep: { type: Type.STRING },
        },
      },
      description: 'Exactly 4 blocks: Morning, Midday, Evening, Night.',
    },
    dailySummaryNote: { type: Type.STRING },
  },
};

export const INDOOR_PROTOCOL_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['protocolHeadline', 'rooms', 'plantRealityCheck', 'budgetTip'],
  properties: {
    protocolHeadline: { type: Type.STRING },
    rooms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['room', 'priorityLevel', 'hacks', 'costTier'],
        properties: {
          room: { type: Type.STRING, enum: ['Living Room', 'Bedroom / Nursery', 'Kitchen'] },
          priorityLevel: { type: Type.STRING, enum: ['Critical', 'High', 'Moderate'] },
          hacks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 practical room-specific Indian home mitigation steps.',
          },
          costTier: { type: Type.STRING },
        },
      },
      description: 'Exactly 3 rooms: Living Room, Bedroom / Nursery, Kitchen.',
    },
    plantRealityCheck: {
      type: Type.STRING,
      description: 'Realistic note explaining indoor plants supplement rather than replace filtration during severe smog.',
    },
    budgetTip: { type: Type.STRING },
  },
};

export const SMOG_SHOCK_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['shockScenario', 'severityAssessment', 'strategies'],
  properties: {
    shockScenario: { type: Type.STRING },
    severityAssessment: { type: Type.STRING },
    strategies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: [
          'id',
          'title',
          'targetTimeBlock',
          'immediateAction',
          'healthAndEmissionImpact',
          'updatedRoutineTitle',
        ],
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          targetTimeBlock: { type: Type.STRING, enum: ['Morning', 'Midday', 'Evening', 'Night'] },
          immediateAction: { type: Type.STRING },
          healthAndEmissionImpact: { type: Type.STRING },
          updatedRoutineTitle: { type: Type.STRING },
        },
      },
      description: 'Exactly 3 immediate fallback strategies.',
    },
  },
};

export const COMMUNITY_BRIEFING_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['executiveSnapshot', 'whatsappAdvisory', 'rwaNotice', 'carpoolPitch'],
  properties: {
    executiveSnapshot: { type: Type.STRING },
    whatsappAdvisory: {
      type: Type.STRING,
      description: 'Ready-to-paste concise family WhatsApp advisory citing the exact live CPCB AQI and cleanest airing window.',
    },
    rwaNotice: {
      type: Type.STRING,
      description: 'Ready-to-paste RWA / apartment society low-emission notice.',
    },
    carpoolPitch: {
      type: Type.STRING,
      description: 'Ready-to-paste school or office carpool message citing estimated CO2 savings.',
    },
  },
};
