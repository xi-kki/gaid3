// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const hasMistral = Boolean(process.env.MISTRAL_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasEnoki = Boolean(process.env.ENOKI_API_KEY);

  const aiConfigured = hasGroq || hasOpenRouter || hasMistral || hasGemini;

  return res.json({
    status: 'online',
    agent: 'Gaid3',
    version: '2.0.0-hackathon',
    memoryProvider: 'Walrus Protocol (MemWal Testnet)',
    aiConfigured,
    providers: {
      groq: hasGroq,
      openrouter: hasOpenRouter,
      mistral: hasMistral,
      gemini: hasGemini,
      enokiZkLogin: hasEnoki,
    },
    primaryModel: hasGroq ? 'qwen/qwen3.8-27b' : hasOpenRouter ? 'openai/gpt-4o-mini' : hasMistral ? 'mistral-small-latest' : 'fallback-offline',
    timestamp: new Date().toISOString(),
  });
}
