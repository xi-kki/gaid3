import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';

// Import Vercel-style API handlers (shared between Vercel deployment and local Express dev server)
import healthHandler from '../../api/health.js';
import chatHandler from '../../api/chat.js';
import guidesHandler from '../../api/guides.js';
import safetyHandler from '../../api/safety.js';
import ingestHandler from '../../api/ingest.js';
import zkloginHandler from '../../api/auth/zklogin.js';
import syncHandler from '../../api/memory/sync.js';
import memoryHandler from '../../api/memory.js';
import flashcardsHandler from '../../api/generate/flashcards.js';
import mindmapHandler from '../../api/generate/mindmap.js';
import fromMemoryHandler from '../../api/generate/from-memory.js';
// Gaid3Agent kept for the in-memory diagnostics endpoint (used by CLI `/memory`)
import { Gaid3Agent } from '../agent/core.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'https://gaid3.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json());

const agent = new Gaid3Agent();

/**
 * Structural type matching the inline VercelRequest/VercelResponse shapes
 * used across api/*.ts. Express Request/Response are a runtime superset;
 * the assertions here bridge the minor header-type variance.
 *
 * Return type is `void` (not `void | Promise<void>`) so TypeScript's
 * void-return-type rule allows handlers that chain return values.
 */
type VercelReq = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string>;
  socket: { remoteAddress?: string };
};

type VercelRes = {
  status: (n: number) => VercelRes;
  json: (o: unknown) => VercelRes;
  setHeader: (k: string, v: string) => void;
  end: () => void;
};

type VercelHandler = (req: VercelReq, res: VercelRes) => void;

/** Mounts a Vercel-style handler on an Express route. */
function mount(method: 'get' | 'post', path: string, handler: VercelHandler) {
  app[method](path, (req: Request, res: Response) => {
    handler(req as VercelReq, res as VercelRes);
  });
}

// --- API Routes (delegated to shared Vercel handler functions) ---
mount('get', '/api/health', healthHandler);
mount('post', '/api/chat', chatHandler);
mount('get', '/api/guides', guidesHandler);
mount('post', '/api/safety', safetyHandler);
mount('post', '/api/ingest', ingestHandler);
mount('post', '/api/auth/zklogin', zkloginHandler);
mount('post', '/api/memory/sync', syncHandler);
mount('get', '/api/memory', memoryHandler);
mount('post', '/api/generate/flashcards', flashcardsHandler);
mount('post', '/api/generate/mindmap', mindmapHandler);
mount('post', '/api/generate/from-memory', fromMemoryHandler);

// Catch-all error handler for Express
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Express error handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Gaid3 API Server running at http://localhost:${PORT}`);
});
