import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { Schema } from '@google/genai';
import type {
  ClarifyingQuestionsResponse,
  CommunityBriefingResponse,
  DailyRoutineResponse,
  IndoorProtocolResponse,
  SmogShockResponse,
} from '../types';
import {
  CLARIFYING_QUESTIONS_SCHEMA,
  COMMUNITY_BRIEFING_SCHEMA,
  DAILY_ROUTINE_SCHEMA,
  INDOOR_PROTOCOL_SCHEMA,
  SMOG_SHOCK_SCHEMA,
} from './geminiSchemas.ts';

interface ModelAttempt {
  model: string;
  thinkingLevel: ThinkingLevel;
}

const MODEL_CHAIN: readonly ModelAttempt[] = [
  { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
];

const PER_ATTEMPT_TIMEOUT_MS = 12_000;

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

function getClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  cachedClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
    msg.includes('timed out')
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

function buildClarifyingQuestionsPrompt(context: Record<string, unknown>): string {
  const count = typeof context.requestedCount === 'number' && context.requestedCount === 2 ? 2 : 3;
  const focus = context.focus === 'indoor' ? 'indoor air-quality and budget-mode mitigation' : 'daily low-emission routine';
  const avoidNote = Array.isArray(context.existingQuestions) && context.existingQuestions.length > 0
    ? ' Do NOT repeat any question listed in existingQuestions.'
    : '';
  return `Live air data & context:\n${JSON.stringify(context)}\nReturn 1 short airContextNote sentence and exactly ${count} crisp ${focus} clarifying questions with 3 short quickOptions each.${avoidNote}`;
}

async function generateStructuredJson<T>(
  prompt: string,
  responseSchema: Schema,
  systemInstruction: string = SYSTEM_INSTRUCTION,
): Promise<T> {
  const ai = getClient();
  let lastError: unknown;

  for (const step of MODEL_CHAIN) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: step.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            thinkingConfig: { thinkingLevel: step.thinkingLevel },
          },
        }),
        PER_ATTEMPT_TIMEOUT_MS,
      );
      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }
      return JSON.parse(rawText) as T;
    } catch (err: unknown) {
      lastError = err;
      if (!isRetryableModelError(err)) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini service temporarily unavailable.');
}

export async function streamClarifyingQuestions(
  context: Record<string, unknown>,
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<ClarifyingQuestionsResponse> {
  const ai = getClient();
  const prompt = buildClarifyingQuestionsPrompt(context);
  let lastError: unknown;

  for (const step of MODEL_CHAIN) {
    if (signal?.aborted) {
      throw new Error('Request aborted by client.');
    }
    let emittedAny = false;
    let accumulated = '';
    try {
      const stream = await withTimeout(
        ai.models.generateContentStream({
          model: step.model,
          contents: prompt,
          config: {
            systemInstruction: FAST_QUESTIONS_SYSTEM,
            responseMimeType: 'application/json',
            responseSchema: CLARIFYING_QUESTIONS_SCHEMA,
            thinkingConfig: { thinkingLevel: step.thinkingLevel },
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
      const parsed = JSON.parse(rawText) as ClarifyingQuestionsResponse;
      return { ...parsed, sourceMode: 'gemini' };
    } catch (err: unknown) {
      lastError = err;
      if (signal?.aborted || emittedAny || !isRetryableModelError(err)) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini service temporarily unavailable.');
}

export async function generateClarifyingQuestions(
  context: Record<string, unknown>,
): Promise<ClarifyingQuestionsResponse> {
  const prompt = buildClarifyingQuestionsPrompt(context);
  const res = await generateStructuredJson<ClarifyingQuestionsResponse>(
    prompt,
    CLARIFYING_QUESTIONS_SCHEMA,
    FAST_QUESTIONS_SYSTEM,
  );
  return { ...res, sourceMode: 'gemini' };
}

export async function generateDailyRoutine(
  context: Record<string, unknown>,
): Promise<DailyRoutineResponse> {
  const prompt = `Generate a concise 4-block daily routine (Morning, Midday, Evening, Night; protectionWeight summing to 100) strictly grounded in this live city AQI, 24h cleanest window, household profile (if specified), additionalContext, and clarifying answers:\n${JSON.stringify(context)}`;
  const res = await generateStructuredJson<DailyRoutineResponse>(prompt, DAILY_ROUTINE_SCHEMA);
  return { ...res, sourceMode: 'gemini' };
}

export async function generateIndoorProtocol(
  context: Record<string, unknown>,
): Promise<IndoorProtocolResponse> {
  const prompt = `Generate a concise room-by-room indoor air mitigation protocol (Living Room, Bedroom / Nursery, Kitchen) tailored to this Indian home setup and live AQI. Note indoor plants supplement rather than replace filtration during severe smog:\n${JSON.stringify(context)}`;
  const res = await generateStructuredJson<IndoorProtocolResponse>(prompt, INDOOR_PROTOCOL_SCHEMA);
  return { ...res, sourceMode: 'gemini' };
}

export async function simulateSmogShock(
  context: Record<string, unknown>,
): Promise<SmogShockResponse> {
  const prompt = `Simulate this sudden smog shock scenario layered onto the household's live city AQI and active routine, returning 3 immediate fallback strategies that update specific routine blocks:\n${JSON.stringify(context)}`;
  const res = await generateStructuredJson<SmogShockResponse>(prompt, SMOG_SHOCK_SCHEMA);
  return { ...res, sourceMode: 'gemini' };
}

export async function generateCommunityBriefing(
  context: Record<string, unknown>,
): Promise<CommunityBriefingResponse> {
  const prompt = `Synthesize this live city CPCB AQI, active routine, and low-emission swap savings into an executive snapshot, WhatsApp family advisory, RWA/apartment society notice, and school/office carpool pitch:\n${JSON.stringify(context)}`;
  const res = await generateStructuredJson<CommunityBriefingResponse>(prompt, COMMUNITY_BRIEFING_SCHEMA);
  return { ...res, sourceMode: 'gemini' };
}
