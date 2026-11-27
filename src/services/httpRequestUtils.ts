import { MAX_API_BODY_BYTES } from '../config/constants.js';
import { AI_ACTION_CONTRACTS, type AiActionName } from '../validation/aqiContracts.js';

export interface ApiRequestLike {
  readonly method?: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body?: unknown;
  readonly socket?: { readonly remoteAddress?: string };
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

export type BodyParseResult =
  | { readonly ok: true; readonly data: Record<string, unknown> }
  | { readonly ok: false; readonly status: 400 | 413; readonly error: string };

/** Extracts a single header string case-insensitively from a Node/Express/Vercel header map. */
export function getHeaderValue(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  name: string,
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readStreamBody(req: ApiRequestLike): Promise<{ raw: string; tooLarge: boolean }> {
  if (typeof req.on !== 'function') return { raw: '', tooLarge: false };
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

/** Reads and validates a JSON API request body within the 128 KB size budget and Zod schema. */
export async function extractAndValidateBody(
  req: ApiRequestLike,
  action: AiActionName,
): Promise<BodyParseResult> {
  const lenHeader = getHeaderValue(req.headers, 'content-length');
  const declaredBytes = lenHeader ? Number.parseInt(lenHeader, 10) : 0;
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_API_BODY_BYTES) {
    return { ok: false, status: 413, error: 'Request payload exceeds 128 KB limit.' };
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
  const result = AI_ACTION_CONTRACTS[action].requestSchema.safeParse(parsedBody);
  if (!result.success) {
    return { ok: false, status: 400, error: 'Invalid request payload.' };
  }
  return { ok: true, data: result.data as Record<string, unknown> };
}

/** Logs server-side AI errors with API keys and query secrets scrubbed before output. */
export function logSafeAiError(action: string, err: unknown): void {
  const errName = err instanceof Error ? err.name : 'Error';
  let msg = err instanceof Error ? err.message : String(err);
  const key = (process.env.GEMINI_API_KEY ?? '').trim();
  if (key) {
    msg = msg.split(key).join('[REDACTED]');
  }
  msg = msg
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]');
  console.error('[BreatheWise AI]', action, errName, msg.slice(0, 160));
}
