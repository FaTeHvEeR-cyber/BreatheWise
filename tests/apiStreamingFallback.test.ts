import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimiter } from '../src/services/rateLimiter';
import { createMockRes, MOCK_GEMINI_RESPONSES, VALID_QUESTIONS_REQ } from './apiTestUtils';

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', async () => {
  const actual = await vi.importActual<typeof import('@google/genai')>('@google/genai');
  return {
    ...actual,
    GoogleGenAI: vi.fn(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      },
    })),
  };
});

import questionsHandler from '../api/gemini/questions';
import streamHandler from '../api/gemini/questions/stream';

const jsonHeaders = { 'content-type': 'application/json' };

describe('Gemini streaming fallbacks, model-chain edge cases, and error branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiter();
    process.env.GEMINI_API_KEY = 'test-secret-api-key-12345';
    delete process.env.GEMINI_MODEL;
  });

  it('rejects empty Gemini responses and non-retryable errors immediately', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateContent.mockResolvedValueOnce({ text: '   ' });
    const emptyRes = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      emptyRes,
    );
    expect(emptyRes.statusCode).toBe(500);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    mockGenerateContent.mockRejectedValueOnce(new Error('Invalid schema argument'));
    const badRes = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      badRes,
    );
    expect(badRes.statusCode).toBe(500);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });

  it('deduplicates model chain when GEMINI_MODEL matches fallback model', async () => {
    process.env.GEMINI_MODEL = 'gemini-3.1-flash-lite';
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateContent.mockRejectedValueOnce(new Error('503 UNAVAILABLE'));

    const res = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      res,
    );
    expect(res.statusCode).toBe(500);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it('falls back across stream model chain on pre-chunk 503 and emits SSE error on total failure', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateContentStream
      .mockRejectedValueOnce(new Error('503 UNAVAILABLE'))
      .mockResolvedValueOnce(
        (async function* () {
          yield { text: JSON.stringify(MOCK_GEMINI_RESPONSES.questions) };
        })(),
      );

    const fallbackSseRes = createMockRes();
    await streamHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      fallbackSseRes,
    );
    expect(fallbackSseRes.chunks.join('')).toContain('gemini-3.1-flash-lite');

    mockGenerateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield { text: '' };
      })(),
    );
    const errSseRes = createMockRes();
    await streamHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      errSseRes,
    );
    expect(errSseRes.chunks.join('')).toContain('event: error');
    errSpy.mockRestore();
  });

  it('aborts SSE stream cleanly when client connection closes', async () => {
    let closeListener: (() => void) | undefined;
    mockGenerateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield { text: '{"airContextNote":"Delhi",' };
        closeListener?.();
        yield { text: '"questions":[]}' };
      })(),
    );

    const res = createMockRes();
    res.writableEnded = false;
    res.on = (event: string, listener: () => void) => {
      if (event === 'close') closeListener = listener;
    };

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await streamHandler({ method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ }, res);
    expect(res.writableEnded).toBe(true);
    expect(res.chunks.join('')).not.toContain('event: error');
    errSpy.mockRestore();
  });
});
