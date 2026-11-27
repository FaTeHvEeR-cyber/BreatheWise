import type {
  ClarifyingQuestionsResponse,
  CommunityBriefingResponse,
  DailyRoutineResponse,
  IndoorProtocolResponse,
  SmogShockResponse,
} from '../types';
import { parsePartialClarifyingQuestions, parseSseChunk } from '../utils/streamingQuestionsParser';

interface ApiErrorPayload {
  error?: string;
}

async function postGeminiRoute<T>(
  path: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let message = `Gemini API route failed (HTTP ${response.status}).`;
    try {
      const body = (await response.json()) as ApiErrorPayload;
      if (body.error) message = body.error;
    } catch {
      // Keep status message
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

/** Streams clarifying questions via SSE and invokes onPartial as JSON fields complete. */
export async function streamClarifyingQuestionsClient(
  payload: Record<string, unknown>,
  onPartial: (partial: ClarifyingQuestionsResponse) => void,
  signal?: AbortSignal,
): Promise<ClarifyingQuestionsResponse> {
  const response = await fetch('/api/gemini/questions/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let message = `Gemini stream failed (HTTP ${response.status}).`;
    try {
      const body = (await response.json()) as ApiErrorPayload;
      if (body.error) message = body.error;
    } catch {
      // Keep status message
    }
    throw new Error(message);
  }

  if (!response.body) {
    return postGeminiRoute<ClarifyingQuestionsResponse>('/api/gemini/questions', payload, signal);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  let rawJson = '';
  let finalResponse: ClarifyingQuestionsResponse | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const decoded = decoder.decode(value, { stream: true });
      const parsedFrame = parseSseChunk(carry, decoded);
      carry = parsedFrame.carry;

      for (const evt of parsedFrame.events) {
        if (evt.event === 'chunk') {
          const { delta } = JSON.parse(evt.data) as { delta?: string };
          if (delta) {
            rawJson += delta;
            const partial = parsePartialClarifyingQuestions(rawJson);
            if (partial) onPartial(partial);
          }
        } else if (evt.event === 'done') {
          finalResponse = JSON.parse(evt.data) as ClarifyingQuestionsResponse;
        } else if (evt.event === 'error') {
          const { error } = JSON.parse(evt.data) as ApiErrorPayload;
          throw new Error(error ?? 'Gemini streaming error.');
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (finalResponse) return finalResponse;
  const parsedFallback = parsePartialClarifyingQuestions(rawJson);
  if (parsedFallback && parsedFallback.questions.length > 0) {
    return parsedFallback;
  }
  throw new Error('Gemini stream ended without clarifying questions.');
}

/** Requests non-streaming clarifying questions from /api/gemini/questions. */
export function callClarifyingQuestions(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ClarifyingQuestionsResponse> {
  return postGeminiRoute<ClarifyingQuestionsResponse>('/api/gemini/questions', payload, signal);
}

/** Requests a personalized 4-block daily routine from /api/gemini/routine. */
export function callDailyRoutine(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<DailyRoutineResponse> {
  return postGeminiRoute<DailyRoutineResponse>('/api/gemini/routine', payload, signal);
}

/** Requests a room-by-room indoor protocol from /api/gemini/indoor. */
export function callIndoorProtocol(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<IndoorProtocolResponse> {
  return postGeminiRoute<IndoorProtocolResponse>('/api/gemini/indoor', payload, signal);
}

/** Requests emergency smog-shock strategies from /api/gemini/shock. */
export function callSmogShock(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<SmogShockResponse> {
  return postGeminiRoute<SmogShockResponse>('/api/gemini/shock', payload, signal);
}

/** Requests shareable family, RWA, and carpool advisories from /api/gemini/community. */
export function callCommunityBriefing(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<CommunityBriefingResponse> {
  return postGeminiRoute<CommunityBriefingResponse>('/api/gemini/community', payload, signal);
}
