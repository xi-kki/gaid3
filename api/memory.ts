// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

import { MemWalClient } from '../src/memory/memwal-client.js';

// Singleton memory client for Vercel (in-memory only, persists across warm invocations)
let memwalInstance: MemWalClient | null = null;

function getMemWal(): MemWalClient {
  if (!memwalInstance) {
    memwalInstance = new MemWalClient();
  }
  return memwalInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const profile = getMemWal().getProfile();
    res.json({
      facts: profile.rawDurableFacts,
      profile: {
        experienceLevel: profile.experienceLevel,
        preferredWallets: profile.preferredWallets,
        preferredChains: profile.preferredChains,
        riskTolerance: profile.riskTolerance,
        goals: profile.goals,
      },
      checklists: profile.checklists,
      mistakes: profile.mistakes,
      walrusBlobId: profile.walrusBlobId,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load memory' });
  }
}