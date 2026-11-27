import { GoogleGenAI } from '@google/genai';
import type { Schema } from '@google/genai';
import type { z } from 'zod';
import type {
  ClarifyingQuestionsResponse,
  CommunityBriefingResponse,
  DailyRoutineResponse,
  IndoorProtocolResponse,
  SmogShockResponse,
} from '../types.js';
import {
  CLARIFYING_QUESTIONS_SCHEMA,
  COMMUNITY_BRIEFING_SCHEMA,
  DAILY_ROUTINE_SCHEMA,
  INDOOR_PROTOCOL_SCHEMA,
  SMOG_SHOCK_SCHEMA,
} from './geminiSchemas.js';
import {
  ClarifyingQuestionsModelSchema,
  CommunityBriefingModelSchema,
  DailyRoutineModelSchema,
  IndoorProtocolModelSchema,
  SmogShockModelSchema,
} from '../validation/aqiContracts.js';

import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  PER_ATTEMPT_TIMEOUT_MS,
  PLACEHOLDER_GEMINI_KEYS,
} from '../config/constants.js';

const SYSTEM_INSTRUCTION = [
  'You are BreatheWise, a concise urban air-quality and low-emission advisor for Indian cities.',
  'ZERO-HALLUCINATION: NEVER invent or alter AQI, PM2.5, PM10, NO2, O3, SO2, CO2, or Rupee values; quote ONLY provided JSON values.',
  'If hasHouseholdProfile is false, do NOT name or assume a sample household; give general city guidance plus any notes provided.',
  'If clarifyingAnswers is empty and hasHouseholdProfile is true, align strictly to the provided household profile.',
  'Keep every sentence crisp, practical, and short.',
].join(' ');

const FAST_QUESTIONS_SYSTEM = [
  'You are BreatheWise for Indian cities.',
  'Quote ONLY the exact AQI and pollutant values in the input; never invent numbers.',
  'If hasHouseholdProfile is false, ask general city resident questions (never assume a sample household).',
  'Be ultra-concise so output finishes fast.',
].join(' ');

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

function getModelChain(): readonly string[] {
  const configured = (process.env.GEMINI_MODEL ?? '').trim();
  const primary = configured || DEFAULT_GEMINI_MODEL;
  return primary === FALLBACK_GEMINI_MODEL ? [primary] : [primary, FALLBACK_GEMINI_MODEL];
}

function getClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey || PLACEHOLDER_GEMINI_KEYS.has(apiKey)) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  if (cachedClient && cachedApiKey === apiKey) {
    return cachedClient;
  }
  cachedApiKey = apiKey;
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

function isRetryableModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('429') ||
    msg.includes('high demand') ||
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('404') ||
    msg.includes('timed out') ||
    msg.includes('500') ||
    msg.includes('INTERNAL') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function parseModelJson(rawText: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as unknown;
}

function buildClarifyingQuestionsPrompt(context: Record<string, unknown>): string {
  const count = typeof context.requestedCount === 'number' && context.requestedCount === 2 ? 2 : 3;
  const focus =
    context.focus === 'indoor'
      ? 'indoor air-quality and budget-mode mitigation'
      : 'daily low-emission routine';
  const avoidNote =
    Array.isArray(context.existingQuestions) && context.existingQuestions.length > 0
      ? ' Do NOT repeat any question listed in existingQuestions.'
      : '';
  return `Live air data & context:\n${JSON.stringify(context)}\nReturn 1 short airContextNote sentence and exactly ${count} crisp ${focus} clarifying questions with 3 short quickOptions each.${avoidNote}`;
}

async function generateStructuredJson<T extends Record<string, unknown>>(
  prompt: string,
  responseSchema: Schema,
  contractSchema: z.ZodType<T>,
  systemInstruction: string = SYSTEM_INSTRUCTION,
): Promise<T & { source: string; sourceMode: 'gemini' }> {
  const ai = getClient();
  let lastError: unknown;

  for (const model of getModelChain()) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
        PER_ATTEMPT_TIMEOUT_MS,
      );
      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }
      const validated = contractSchema.parse(parseModelJson(rawText));
      return { ...validated, source: model, sourceMode: 'gemini' };
    } catch (err: unknown) {
      lastError = err;
      if (!isRetryableModelError(err)) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini service temporarily unavailable.');
}

/** Streams clarifying questions from Gemini with automatic fallback across MODEL_CHAIN. */
export async function streamClarifyingQuestions(
  context: Record<string, unknown>,
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<ClarifyingQuestionsResponse> {
  const ai = getClient();
  const prompt = buildClarifyingQuestionsPrompt(context);
  let lastError: unknown;

  for (const model of getModelChain()) {
    if (signal?.aborted) {
      throw new Error('Request aborted by client.');
    }
    let emittedAny = false;
    let accumulated = '';
    try {
      const stream = await withTimeout(
        ai.models.generateContentStream({
          model,
          contents: prompt,
          config: {
            systemInstruction: FAST_QUESTIONS_SYSTEM,
            responseMimeType: 'application/json',
            responseSchema: CLARIFYING_QUESTIONS_SCHEMA,
          },
        }),
        PER_ATTEMPT_TIMEOUT_MS,
      );

      for await (const chunk of stream) {
        if (signal?.aborted) {
          throw new Error('Request aborted by client.');
        }
        const delta = chunk.text ?? '';
        if (delta) {
          emittedAny = true;
          accumulated += delta;
          onChunk(delta);
        }
      }

      const rawText = accumulated.trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty stream.');
      }
      const validated = ClarifyingQuestionsModelSchema.parse(parseModelJson(rawText));
      return { ...validated, source: model, sourceMode: 'gemini' };
    } catch (err: unknown) {
      lastError = err;
      if (signal?.aborted || emittedAny || !isRetryableModelError(err)) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini service temporarily unavailable.');
}

/** Generates non-streaming clarifying intake questions via Gemini structured JSON. */
export function generateClarifyingQuestions(
  context: Record<string, unknown>,
): Promise<ClarifyingQuestionsResponse> {
  const prompt = buildClarifyingQuestionsPrompt(context);
  return generateStructuredJson(
    prompt,
    CLARIFYING_QUESTIONS_SCHEMA,
    ClarifyingQuestionsModelSchema,
    FAST_QUESTIONS_SYSTEM,
  );
}

/** Generates a 4-block low-emission daily routine grounded in live CPCB AQI data. */
export function generateDailyRoutine(
  context: Record<string, unknown>,
): Promise<DailyRoutineResponse> {
  const prompt = `Generate a concise 4-block daily routine (Morning, Midday, Evening, Night; protectionWeight summing to 100) strictly grounded in this live city AQI, 24h cleanest window, household profile (if specified), additionalContext, and clarifying answers:\n${JSON.stringify(context)}`;
  return generateStructuredJson(prompt, DAILY_ROUTINE_SCHEMA, DailyRoutineModelSchema);
}

/** Generates a room-by-room indoor air mitigation protocol tailored to the home setup. */
export function generateIndoorProtocol(
  context: Record<string, unknown>,
): Promise<IndoorProtocolResponse> {
  const prompt = `Generate a concise room-by-room indoor air mitigation protocol (Living Room, Bedroom / Nursery, Kitchen) tailored to this Indian home setup and live AQI. Note indoor plants supplement rather than replace filtration during severe smog:\n${JSON.stringify(context)}`;
  return generateStructuredJson(prompt, INDOOR_PROTOCOL_SCHEMA, IndoorProtocolModelSchema);
}

/** Simulates a sudden smog shock scenario and returns 3 routine fallback strategies. */
export function simulateSmogShock(context: Record<string, unknown>): Promise<SmogShockResponse> {
  const prompt = `Simulate this sudden smog shock scenario layered onto the household's live city AQI and active routine, returning 3 immediate fallback strategies that update specific routine blocks:\n${JSON.stringify(context)}`;
  return generateStructuredJson(prompt, SMOG_SHOCK_SCHEMA, SmogShockModelSchema);
}

/** Synthesizes live AQI and habit swap savings into shareable family, RWA, and carpool notices. */
export function generateCommunityBriefing(
  context: Record<string, unknown>,
): Promise<CommunityBriefingResponse> {
  const prompt = `Synthesize this live city CPCB AQI, active routine, and low-emission swap savings into an executive snapshot, WhatsApp family advisory, RWA/apartment society notice, and school/office carpool pitch:\n${JSON.stringify(context)}`;
  return generateStructuredJson(prompt, COMMUNITY_BRIEFING_SCHEMA, CommunityBriefingModelSchema);
}
