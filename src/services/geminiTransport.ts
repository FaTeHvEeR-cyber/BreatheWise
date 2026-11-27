import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  PLACEHOLDER_GEMINI_KEYS,
} from '../config/constants.js';

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

/** Returns the active primary and fallback Gemini model IDs from environment or defaults. */
export function getModelChain(): readonly string[] {
  const configured = (process.env.GEMINI_MODEL ?? '').trim();
  const primary = configured || DEFAULT_GEMINI_MODEL;
  return primary === FALLBACK_GEMINI_MODEL ? [primary] : [primary, FALLBACK_GEMINI_MODEL];
}

/** Returns a cached GoogleGenAI SDK client after rejecting missing or placeholder keys. */
export function getGeminiClient(): GoogleGenAI {
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

/** Checks whether a Gemini API failure represents a transient or model-availability error. */
export function isRetryableModelError(err: unknown): boolean {
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

/** Rejects a pending Gemini SDK promise if it exceeds the configured timeout budget. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
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

/** Strips optional Markdown code fences from Gemini output and parses JSON. */
export function parseModelJson(rawText: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as unknown;
}
