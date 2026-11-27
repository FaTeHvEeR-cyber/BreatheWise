import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimiter } from '../src/services/rateLimiter';
import { createMockRes, VALID_QUESTIONS_REQ } from './apiTestUtils';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', async () => {
  const actual = await vi.importActual<typeof import('@google/genai')>('@google/genai');
  return {
    ...actual,
    GoogleGenAI: vi.fn(() => ({
      models: { generateContent: mockGenerateContent, generateContentStream: vi.fn() },
    })),
  };
});

import questionsHandler from '../api/gemini/questions';
import routineHandler from '../api/gemini/routine';

describe('API HTTP security guards, limits, and secret-free error responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiter();
    process.env.GEMINI_API_KEY = 'test-secret-api-key-12345';
  });

  it('rejects non-POST with 405 + Allow: POST and non-JSON with 415', async () => {
    const res405 = createMockRes();
    await questionsHandler({ method: 'GET', headers: {} }, res405);
    expect(res405.statusCode).toBe(405);
    expect(res405.headers.allow).toBe('POST');
    expect(res405.headers['cache-control']).toBe('no-store');

    const res415 = createMockRes();
    await routineHandler(
      { method: 'POST', headers: { 'content-type': 'text/plain' }, body: {} },
      res415,
    );
    expect(res415.statusCode).toBe(415);
  });

  it('rejects >128 KB payloads with 413 (header, object, and stream)', async () => {
    const resHeader = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': String(130 * 1024) },
        body: VALID_QUESTIONS_REQ,
      },
      resHeader,
    );
    expect(resHeader.statusCode).toBe(413);

    const resObj = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { ...VALID_QUESTIONS_REQ, notes: 'x'.repeat(132 * 1024) },
      },
      resObj,
    );
    expect(resObj.statusCode).toBe(413);

    const streamReq = Object.assign(new EventEmitter(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const resStream = createMockRes();
    const pending = questionsHandler(streamReq, resStream);
    streamReq.emit('data', Buffer.alloc(130 * 1024, 97));
    await pending;
    expect(resStream.statusCode).toBe(413);
  });

  it('rejects invalid JSON or Zod schema violations with 400', async () => {
    const badJsonRes = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' },
      badJsonRes,
    );
    expect(badJsonRes.statusCode).toBe(400);

    const badZodRes = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { ...VALID_QUESTIONS_REQ, aqi: 999 },
      },
      badZodRes,
    );
    expect(badZodRes.statusCode).toBe(400);
  });

  it('rejects placeholder keys and returns secret-free 500 errors and safe logs', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GEMINI_API_KEY = 'your_google_ai_studio_api_key_here';
    const placeholderRes = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: VALID_QUESTIONS_REQ,
      },
      placeholderRes,
    );
    expect(placeholderRes.statusCode).toBe(500);
    expect(JSON.stringify(placeholderRes.jsonBody)).not.toContain(
      'your_google_ai_studio_api_key_here',
    );

    process.env.GEMINI_API_KEY = 'SUPER_SECRET_KEY_XYZ_987';
    mockGenerateContent.mockRejectedValueOnce(
      new Error(
        'Fatal error using SUPER_SECRET_KEY_XYZ_987&key=AIzaSySecretToken99 at /secret/stack',
      ),
    );
    const secretRes = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: VALID_QUESTIONS_REQ,
      },
      secretRes,
    );
    expect(secretRes.statusCode).toBe(500);
    expect(JSON.stringify(secretRes.jsonBody)).not.toContain('SUPER_SECRET_KEY_XYZ_987');
    expect(JSON.stringify(secretRes.jsonBody)).not.toContain('/secret/stack');
    expect(errSpy).toHaveBeenCalled();
    const logged = errSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain('SUPER_SECRET_KEY_XYZ_987');
    expect(logged).not.toContain('AIzaSySecretToken99');
    errSpy.mockRestore();
  });

  it('enforces per-IP 30/min sliding-window rate limit with 429 and Retry-After', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        airContextNote: 'Delhi AQI 280.',
        questions: [
          { id: 'q1', question: 'Metro?', reason: 'Clean.', quickOptions: ['Y', 'N', 'W'] },
        ],
      }),
    });

    for (let i = 0; i < 30; i += 1) {
      const okRes = createMockRes();
      await questionsHandler(
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '203.0.113.9, 10.0.0.1',
          },
          body: VALID_QUESTIONS_REQ,
        },
        okRes,
      );
      expect(okRes.statusCode).toBe(200);
    }

    const throttledRes = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
        body: VALID_QUESTIONS_REQ,
      },
      throttledRes,
    );
    expect(throttledRes.statusCode).toBe(429);
    expect(Number(throttledRes.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(throttledRes.headers['cache-control']).toBe('no-store');

    const distinctIpRes = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-real-ip': '198.51.100.42' },
        body: VALID_QUESTIONS_REQ,
      },
      distinctIpRes,
    );
    expect(distinctIpRes.statusCode).toBe(200);
  });

  it('handles streamed valid JSON, empty stream, string size cap, and array body errors', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        airContextNote: 'Delhi AQI 280.',
        questions: [
          { id: 'q1', question: 'Metro?', reason: 'Clean.', quickOptions: ['Y', 'N', 'W'] },
        ],
      }),
    });

    const validStreamReq = Object.assign(new EventEmitter(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      socket: { remoteAddress: '127.0.0.9' },
    });
    const okStreamRes = createMockRes();
    const p1 = questionsHandler(validStreamReq, okStreamRes);
    validStreamReq.emit('data', Buffer.from(JSON.stringify(VALID_QUESTIONS_REQ)));
    validStreamReq.emit('end');
    await p1;
    expect(okStreamRes.statusCode).toBe(200);

    const emptyStreamReq = Object.assign(new EventEmitter(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const emptyRes = createMockRes();
    const p2 = questionsHandler(emptyStreamReq, emptyRes);
    emptyStreamReq.emit('data', '   ');
    emptyStreamReq.emit('end');
    await p2;
    expect(emptyRes.statusCode).toBe(400);

    const oversizedStrRes = createMockRes();
    await questionsHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'a'.repeat(130 * 1024),
      },
      oversizedStrRes,
    );
    expect(oversizedStrRes.statusCode).toBe(413);

    const arrayBodyRes = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: [] },
      arrayBodyRes,
    );
    expect(arrayBodyRes.statusCode).toBe(400);
  });
});
