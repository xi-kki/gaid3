// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string,string | string[] | undefined>; query?: Record<string,string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n:number)=>VercelResponse; json: (o:unknown)=>VercelResponse; setHeader:(k:string,v:string)=>void; end:()=>void; };
import { z } from 'zod';

const BodySchema = z.object({
  sourceText: z.string().min(20).max(20000),
  count: z.number().int().min(3).max(30).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { sourceText, count = 12, difficulty = 'beginner' } = parsed.data;

  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'AI not configured. Set GROQ_API_KEY in Vercel env.' });
  }

  const systemPrompt = `You are a flashcard generator for Gaid3 (NotebookLM-style study tool).
Output ONLY valid JSON (no markdown fences) with shape:
{
  "cards": [
    { "id": "c1", "front": "question (clear, concise)", "back": "answer (1-3 sentences)", "hint": "optional hint", "tag": "topic" }
  ]
}
Requirements:
- Exactly ${count} cards
- Difficulty: ${difficulty}
- Mix: definition, why/how, scenario, common mistake
- For Web3 content, include safety angle (seed phrase, approvals, phishing) where relevant
- Front = active recall question. Back = correct answer, no hedging.
`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: sourceText.slice(0, 12000) },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const t = await groqRes.text();
      return res.status(502).json({ error: `Groq error ${groqRes.status}`, detail: t.slice(0, 400) });
    }
    const data = (await groqRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    const json = JSON.parse(raw) as unknown;
    const asObj = json as { cards?: unknown[] };
    if (!Array.isArray(asObj.cards)) {
      return res.status(502).json({ error: 'Model returned invalid shape', raw: raw.slice(0, 1000) });
    }
    return res.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
