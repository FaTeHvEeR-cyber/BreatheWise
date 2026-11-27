import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  handleAiPostRequest,
  handleHealthRequest,
  handleQuestionsStreamRequest,
} from './src/services/aiController';
import { MAX_API_BODY_BYTES } from './src/validation/aqiContracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

interface ExpressBodyError extends Error {
  status?: number;
  type?: string;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: MAX_API_BODY_BYTES }));

  app.use((err: ExpressBodyError, _req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  });

  app.all('/api/health', (req, res) => handleHealthRequest(req, res));
  app.all('/api/gemini/questions/stream', (req, res) => void handleQuestionsStreamRequest(req, res));
  app.all('/api/gemini/questions', (req, res) => void handleAiPostRequest(req, res, 'clarifyingQuestions'));
  app.all('/api/gemini/routine', (req, res) => void handleAiPostRequest(req, res, 'dailyRoutine'));
  app.all('/api/gemini/indoor', (req, res) => void handleAiPostRequest(req, res, 'indoorProtocol'));
  app.all('/api/gemini/shock', (req, res) => void handleAiPostRequest(req, res, 'smogShock'));
  app.all('/api/gemini/community', (req, res) => void handleAiPostRequest(req, res, 'communityBriefing'));

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
