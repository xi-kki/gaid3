// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string,string | string[] | undefined>; query?: Record<string,string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n:number)=>VercelResponse; json: (o:unknown)=>VercelResponse; setHeader:(k:string,v:string)=>void; end:()=>void; };

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasXai = Boolean(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  return res.json({
    status: 'online',
    agent: 'Gaid3',
    version: '1.0.0',
    memoryProvider: 'Walrus Protocol (MemWal)',
    aiConfigured: hasGroq || hasXai || hasGemini,
    providers: { groq: hasGroq, xai: hasXai, gemini: hasGemini },
    timestamp: new Date().toISOString(),
  });
}
