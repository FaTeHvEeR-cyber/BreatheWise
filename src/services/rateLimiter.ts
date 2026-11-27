import type { IncomingHttpHeaders } from 'node:http';

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 30;

const requestLogByIp = new Map<string, number[]>();

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

/** Extracts a normalized client IP string from proxy headers or socket address. */
export function getClientIp(
  headers: Record<string, string | string[] | undefined> | IncomingHttpHeaders,
  remoteAddress?: string,
): string {
  const forwarded = headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof firstForwarded === 'string' && firstForwarded.trim()) {
    return firstForwarded.split(',')[0].trim();
  }
  const realIp = headers['x-real-ip'];
  const realIpVal = Array.isArray(realIp) ? realIp[0] : realIp;
  if (typeof realIpVal === 'string' && realIpVal.trim()) {
    return realIpVal.trim();
  }
  return remoteAddress?.trim() || 'unknown';
}

/** Checks and records a request against a per-IP 60-second sliding window. */
export function checkRateLimit(
  clientIp: string,
  nowMs: number = Date.now(),
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
): RateLimitDecision {
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const recent = (requestLogByIp.get(clientIp) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= maxRequests) {
    const oldest = recent[0] ?? nowMs;
    const retryMs = Math.max(1_000, RATE_LIMIT_WINDOW_MS - (nowMs - oldest));
    requestLogByIp.set(clientIp, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil(retryMs / 1_000) };
  }

  recent.push(nowMs);
  requestLogByIp.set(clientIp, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears all recorded sliding-window timestamps (for isolated unit tests). */
export function resetRateLimiter(): void {
  requestLogByIp.clear();
}
