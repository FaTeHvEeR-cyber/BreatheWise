import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      new Error('Fatal error using SUPER_SECRET_KEY_XYZ_987 at /secret/stack'),
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
    expect(errSpy.mock.calls.flat().join(' ')).not.toContain('SUPER_SECRET_KEY_XYZ_987');
    errSpy.mockRestore();
  });
});
