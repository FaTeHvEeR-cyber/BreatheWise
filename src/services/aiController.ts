import {
  AI_ACTION_CONTRACTS,
  MAX_API_BODY_BYTES,
  type AiActionName,
} from '../validation/aqiContracts.js';
import {
  generateClarifyingQuestions,
  generateCommunityBriefing,
  generateDailyRoutine,
  generateIndoorProtocol,
  simulateSmogShock,
  streamClarifyingQuestions,
} from './geminiService.js';

export interface ApiRequestLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface ApiResponseLike {
  writableEnded?: boolean;
  status(code: number): ApiResponseLike;
  json(payload: unknown): void;
  setHeader(name: string, value: string | string[]): void;
  write?(chunk: string): boolean;
  end?(chunk?: string): void;
  flushHeaders?(): void;
  on?(event: string, listener: () => void): void;
}

const ACTION_HANDLERS: Record<AiActionName, (payload: Record<string, unknown>) => Promise<unknown>> = {
  clarifyingQuestions: generateClarifyingQuestions,
  dailyRoutine: generateDailyRoutine,
  indoorProtocol: generateIndoorProtocol,
  smogShock: simulateSmogShock,
  communityBriefing: generateCommunityBriefing,
};

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readStreamBody(req: ApiRequestLike): Promise<{ raw: string; tooLarge: boolean }> {
  if (typeof req.on !== 'function') {
    return { raw: '', tooLarge: false };
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    req.on?.('data', (chunk: unknown) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      totalBytes += buf.byteLength;
      if (totalBytes > MAX_API_BODY_BYTES) {
        settled = true;
        resolve({ raw: '', tooLarge: true });
        return;
      }
      chunks.push(buf);
    });
    req.on?.('end', () => {
      if (!settled) {
        settled = true;
        resolve({ raw: Buffer.concat(chunks).toString('utf8'), tooLarge: false });
      }
    });
    req.on?.('error', (err: unknown) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}

type BodyParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: 400 | 413; error: string };

async function extractAndValidateBody(
  req: ApiRequestLike,
  action: AiActionName,
): Promise<BodyParseResult> {
  const lenHeader = getHeaderValue(req.headers, 'content-length');
  if (lenHeader) {
    const declaredBytes = Number.parseInt(lenHeader, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_API_BODY_BYTES) {
      return { ok: false, status: 413, error: 'Request payload exceeds 128 KB limit.' };
    }
  }

  let parsedBody: unknown = req.body;
  if (typeof parsedBody === 'string') {
    if (Buffer.byteLength(parsedBody, 'utf8') > MAX_API_BODY_BYTES) {
      return { ok: false, status: 413, error: 'Request payload exceeds 128 KB limit.' };
    }
    try {
      parsedBody = JSON.parse(parsedBody) as unknown;
    } catch {
      return { ok: false, status: 400, error: 'Invalid JSON request body.' };
    }
  } else if (parsedBody === undefined) {
    const streamed = await readStreamBody(req);
    if (streamed.tooLarge) {
      return { ok: false, status: 413, error: 'Request payload exceeds 128 KB limit.' };
    }
    if (!streamed.raw.trim()) {
      return { ok: false, status: 400, error: 'Request body is required.' };
    }
    try {
      parsedBody = JSON.parse(streamed.raw) as unknown;
    } catch {
      return { ok: false, status: 400, error: 'Invalid JSON request body.' };
    }
  } else if (Buffer.byteLength(JSON.stringify(parsedBody), 'utf8') > MAX_API_BODY_BYTES) {
    return { ok: false, status: 413, error: 'Request payload exceeds 128 KB limit.' };
  }

  if (!isPlainRecord(parsedBody)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object.' };
  }

  const contract = AI_ACTION_CONTRACTS[action];
  const result = contract.requestSchema.safeParse(parsedBody);
  if (!result.success) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid request payload.',
    };
  }
  return { ok: true, data: result.data as Record<string, unknown> };
}

function validatePostHeaders(req: ApiRequestLike, res: ApiResponseLike): boolean {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return false;
  }
  const contentType = (getHeaderValue(req.headers, 'content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    res.status(415).json({ error: 'Unsupported Media Type. Content-Type must be application/json.' });
    return false;
  }
  return true;
}

export function handleHealthRequest(req: ApiRequestLike, res: ApiResponseLike): void {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
    return;
  }
  res.status(200).json({ status: 'ok', app: 'BreatheWise', timestamp: new Date().toISOString() });
}

export async function handleAiPostRequest(
  req: ApiRequestLike,
  res: ApiResponseLike,
  action: AiActionName,
): Promise<void> {
  if (!validatePostHeaders(req, res)) return;
  const bodyCheck = await extractAndValidateBody(req, action);
  if (!bodyCheck.ok) {
    res.status(bodyCheck.status).json({ error: bodyCheck.error });
    return;
  }
  try {
    const rawResult = await ACTION_HANDLERS[action](bodyCheck.data);
    const validated = AI_ACTION_CONTRACTS[action].responseSchema.parse(rawResult);
    res.status(200).json(validated);
  } catch {
    res.status(500).json({
      error: 'AI advisor request failed. Please retry or use deterministic local guidance.',
    });
  }
}

function writeSseEvent(res: ApiResponseLike, event: string, data: unknown): void {
  if (res.writableEnded) return;
  res.write?.(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function handleQuestionsStreamRequest(
  req: ApiRequestLike,
  res: ApiResponseLike,
): Promise<void> {
  if (!validatePostHeaders(req, res)) return;
  const bodyCheck = await extractAndValidateBody(req, 'clarifyingQuestions');
  if (!bodyCheck.ok) {
    res.status(bodyCheck.status).json({ error: bodyCheck.error });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const controller = new AbortController();
  res.on?.('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const finalResponse = await streamClarifyingQuestions(
      bodyCheck.data,
      (delta) => writeSseEvent(res, 'chunk', { delta }),
      controller.signal,
    );
    const validated = AI_ACTION_CONTRACTS.clarifyingQuestions.responseSchema.parse(finalResponse);
    writeSseEvent(res, 'done', validated);
  } catch {
    if (!controller.signal.aborted) {
      writeSseEvent(res, 'error', {
        error: 'AI stream temporarily unavailable. Falling back to deterministic local questions.',
      });
    }
  } finally {
    if (!res.writableEnded) res.end?.();
  }
}
