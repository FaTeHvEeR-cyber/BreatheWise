import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  generateClarifyingQuestions,
  generateCommunityBriefing,
  generateDailyRoutine,
  generateIndoorProtocol,
  simulateSmogShock,
  streamClarifyingQuestions,
} from './src/services/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractReadableError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Unexpected Gemini API error.';
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // Plain error string
  }
  return raw;
}

function handleRouteError(res: express.Response, err: unknown): void {
  const message = extractReadableError(err);
  if (message.includes('GEMINI_API_KEY')) {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not set in Settings > Secrets.',
    });
    return;
  }
  res.status(502).json({ error: message });
}

function writeSseEvent(res: express.Response, event: string, data: unknown): void {
  if (res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function registerGeminiPost<T>(
  app: express.Express,
  routePath: string,
  handler: (payload: Record<string, unknown>) => Promise<T>,
): void {
  app.post(routePath, async (req, res) => {
    if (!isPlainRecord(req.body)) {
      res.status(400).json({ error: 'Invalid JSON request payload.' });
      return;
    }
    try {
      const result = await handler(req.body);
      res.json(result);
    } catch (err: unknown) {
      handleRouteError(res, err);
    }
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'BreatheWise', timestamp: new Date().toISOString() });
  });

  app.post('/api/gemini/questions/stream', async (req, res) => {
    if (!isPlainRecord(req.body)) {
      res.status(400).json({ error: 'Invalid JSON request payload.' });
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    try {
      const finalResponse = await streamClarifyingQuestions(
        req.body,
        (delta) => writeSseEvent(res, 'chunk', { delta }),
        controller.signal,
      );
      writeSseEvent(res, 'done', finalResponse);
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        const message = extractReadableError(err);
        const readable = message.includes('GEMINI_API_KEY')
          ? 'GEMINI_API_KEY is not set in Settings > Secrets.'
          : message;
        writeSseEvent(res, 'error', { error: readable });
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  registerGeminiPost(app, '/api/gemini/questions', generateClarifyingQuestions);
  registerGeminiPost(app, '/api/gemini/routine', generateDailyRoutine);
  registerGeminiPost(app, '/api/gemini/indoor', generateIndoorProtocol);
  registerGeminiPost(app, '/api/gemini/shock', simulateSmogShock);
  registerGeminiPost(app, '/api/gemini/community', generateCommunityBriefing);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BreatheWise server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err: unknown) => {
  console.error('Failed to start BreatheWise server:', err);
  process.exit(1);
});
