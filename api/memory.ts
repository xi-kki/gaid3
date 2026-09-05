// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

// Simple in-memory profile for Vercel serverless (stateless - resets on cold start)
// For persistent memory, use Walrus sync via /api/memory/sync
interface UserMemoryFact {
  id: string;
  category: 'experience' | 'wallet' | 'chain' | 'mistake' | 'risk' | 'goal' | 'checklist' | 'general';
  statement: string;
  createdAt: string;
  source: 'user_statement' | 'checklist_saved' | 'incident_report';
  walrusBlobId?: string;
}

interface UserChecklist {
  id: string;
  title: string;
  description: string;
  chain: string;
  steps: {
    stepNumber: number;
    title: string;
    action: string;
    isRisky: boolean;
    cautionNote?: string;
    completed: boolean;
  }[];
  completedAt?: string;
  walrusBlobId?: string;
}

interface UserMistakeEntry {
  id: string;
  context: string;
  whatHappened: string;
  remedyLesson: string;
  timestamp: string;
}

interface Gaid3UserProfile {
  experienceLevel: 'beginner' | 'some_experience' | 'intermediate' | 'advanced';
  preferredWallets: string[];
  preferredChains: string[];
  riskTolerance: 'very_low' | 'moderate' | 'high';
  goals: string[];
  mistakes: UserMistakeEntry[];
  checklists: UserChecklist[];
  rawDurableFacts: UserMemoryFact[];
  lastUpdated: string;
  walrusEpoch?: number;
  walrusBlobId?: string;
}

// In-memory singleton (persists across warm invocations only)
let memoryProfile: Gaid3UserProfile = {
  experienceLevel: 'beginner',
  preferredWallets: [],
  preferredChains: [],
  riskTolerance: 'very_low',
  goals: [],
  mistakes: [],
  checklists: [],
  rawDurableFacts: [],
  lastUpdated: new Date().toISOString(),
  walrusEpoch: undefined,
  walrusBlobId: undefined,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    res.json({
      facts: memoryProfile.rawDurableFacts,
      profile: {
        experienceLevel: memoryProfile.experienceLevel,
        preferredWallets: memoryProfile.preferredWallets,
        preferredChains: memoryProfile.preferredChains,
        riskTolerance: memoryProfile.riskTolerance,
        goals: memoryProfile.goals,
      },
      checklists: memoryProfile.checklists,
      mistakes: memoryProfile.mistakes,
      walrusBlobId: memoryProfile.walrusBlobId,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load memory' });
  }
}