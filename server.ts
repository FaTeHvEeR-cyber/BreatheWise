import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  handleAiPostRequest,
  handleHealthRequest,
  handleQuestionsStreamRequest,
} from './src/services/aiController.js';
import { MAX_API_BODY_BYTES } from './src/validation/aqiContracts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const PROD_CSP = [
  "default-src 'self'",
  "connect-src 'self' https://air-quality-api.open-meteo.com https://geocoding-api.open-meteo.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data:",
  "script-src 'self'",
].join('; ');

const DEV_CSP = PROD_CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");

interface ExpressBodyError extends Error {
  status?: number;
  type?: string;
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', IS_PROD ? PROD_CSP : DEV_CSP);
    next();
  });
  app.use(express.json({ limit: MAX_API_BODY_BYTES }));

  app.use(
    (
      err: ExpressBodyError,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.setHeader('Cache-Control', 'no-store');
      if (err.type === 'entity.too.large' || err.status === 413) {
        res.status(413).json({ error: 'Request payload exceeds 128 KB limit.' });
        return;
      }
      if (err instanceof SyntaxError && err.status === 400) {
        res.status(400).json({ error: 'Invalid JSON request body.' });
        return;
      }
      next(err);
    },
  );

  app.all('/api/health', (req, res) => handleHealthRequest(req, res));
  app.all(
    '/api/gemini/questions/stream',
    (req, res) => void handleQuestionsStreamRequest(req, res),
  );
  app.all(
    '/api/gemini/questions',
    (req, res) => void handleAiPostRequest(req, res, 'clarifyingQuestions'),
  );
  app.all('/api/gemini/routine', (req, res) => void handleAiPostRequest(req, res, 'dailyRoutine'));
  app.all('/api/gemini/indoor', (req, res) => void handleAiPostRequest(req, res, 'indoorProtocol'));
  app.all('/api/gemini/shock', (req, res) => void handleAiPostRequest(req, res, 'smogShock'));
  app.all(
    '/api/gemini/community',
    (req, res) => void handleAiPostRequest(req, res, 'communityBriefing'),
  );

  if (!IS_PROD) {
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`BreatheWise server listening on http://localhost:${PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`Received ${signal}, shutting down BreatheWise server...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err: unknown) => {
  console.error('Failed to start BreatheWise server:', err);
  process.exit(1);
});
