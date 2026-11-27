import { DEFAULT_GEMINI_MODEL } from '../config/constants.js';
import { AI_ACTION_CONTRACTS, type AiActionName } from '../validation/aqiContracts.js';
import {
  generateClarifyingQuestions,
  generateCommunityBriefing,
  generateDailyRoutine,
  generateIndoorProtocol,
  simulateSmogShock,
  streamClarifyingQuestions,
} from './geminiService.js';
import {
  extractAndValidateBody,
  getHeaderValue,
  logSafeAiError,
  type ApiRequestLike,
  type ApiResponseLike,
} from './httpRequestUtils.js';
import { checkRateLimit, getClientIp } from './rateLimiter.js';

export type { ApiRequestLike, ApiResponseLike };

const ACTION_HANDLERS: Record<
  AiActionName,
  (payload: Record<string, unknown>) => Promise<unknown>
> = {
  clarifyingQuestions: generateClarifyingQuestions,
  dailyRoutine: generateDailyRoutine,
  indoorProtocol: generateIndoorProtocol,
  smogShock: simulateSmogShock,
  communityBriefing: generateCommunityBriefing,
};

async function prepareAiRequest(
  req: ApiRequestLike,
  res: ApiResponseLike,
  action: AiActionName,
): Promise<Record<string, unknown> | null> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return null;
  }
  const contentType = (getHeaderValue(req.headers, 'content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    res
      .status(415)
      .json({ error: 'Unsupported Media Type. Content-Type must be application/json.' });
    return null;
  }
  const limit = checkRateLimit(getClientIp(req.headers, req.socket?.remoteAddress));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Please wait before retrying.' });
    return null;
  }
  const bodyCheck = await extractAndValidateBody(req, action);
  if (!bodyCheck.ok) {
    res.status(bodyCheck.status).json({ error: bodyCheck.error });
    return null;
  }
  return bodyCheck.data;
}

/** Handles GET /api/health checks with Gemini configuration status. */
export function handleHealthRequest(req: ApiRequestLike, res: ApiResponseLike): void {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
    return;
  }
  res.status(200).json({
    status: 'ok',
    app: 'BreatheWise',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean((process.env.GEMINI_API_KEY ?? '').trim()),
    model: (process.env.GEMINI_MODEL ?? '').trim() || DEFAULT_GEMINI_MODEL,
  });
}

/** Validates and executes POST /api/gemini/* action requests against Zod trust boundaries. */
export async function handleAiPostRequest(
  req: ApiRequestLike,
  res: ApiResponseLike,
  action: AiActionName,
): Promise<void> {
  const validatedBody = await prepareAiRequest(req, res, action);
  if (!validatedBody) return;
  try {
    const rawResult = await ACTION_HANDLERS[action](validatedBody);
    const validated = AI_ACTION_CONTRACTS[action].responseSchema.parse(rawResult);
    res.status(200).json(validated);
  } catch (err: unknown) {
    logSafeAiError(action, err);
    res.status(500).json({
      error: 'AI advisor request failed. Please retry or use deterministic local guidance.',
    });
  }
}

function writeSseEvent(res: ApiResponseLike, event: string, data: unknown): void {
  if (res.writableEnded) return;
  res.write?.(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Streams incremental clarifying questions over SSE with Zod input/output validation. */
export async function handleQuestionsStreamRequest(
  req: ApiRequestLike,
  res: ApiResponseLike,
): Promise<void> {
  const validatedBody = await prepareAiRequest(req, res, 'clarifyingQuestions');
  if (!validatedBody) return;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const controller = new AbortController();
  res.on?.('close', () => {
    if (res.writableEnded === false) controller.abort();
  });

  try {
    const finalResponse = await streamClarifyingQuestions(
      validatedBody,
      (delta) => writeSseEvent(res, 'chunk', { delta }),
      controller.signal,
    );
    const validated = AI_ACTION_CONTRACTS.clarifyingQuestions.responseSchema.parse(finalResponse);
    writeSseEvent(res, 'done', validated);
  } catch (err: unknown) {
    logSafeAiError('clarifyingQuestions:stream', err);
    if (!controller.signal.aborted) {
      writeSseEvent(res, 'error', {
        error: 'AI stream temporarily unavailable. Falling back to deterministic local questions.',
      });
    }
  } finally {
    if (!res.writableEnded) res.end?.();
  }
}
