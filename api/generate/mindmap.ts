// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string,string | string[] | undefined>; query?: Record<string,string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n:number)=>VercelResponse; json: (o:unknown)=>VercelResponse; setHeader:(k:string,v:string)=>void; end:()=>void; };
import { z } from 'zod';

const BodySchema = z.object({
  sourceText: z.string().min(20).max(20000),
  title: z.string().max(120).optional(),
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { sourceText, title } = parsed.data;

  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'AI not configured. Set GROQ_API_KEY in Vercel env.' });
  }

  const systemPrompt = `You are a mind-map generator for Gaid3 (Web3 onboarding + study tool like NotebookLM).
Given source text, output ONLY valid JSON (no markdown, no fences) with shape:
{
  "title": "string",
  "nodes": [{ "id": "n1", "label": "short label (2-5 words)", "level": 0|1|2, "summary": "one-sentence" }],
  "edges": [{ "from": "n1", "to": "n2", "label": "relation (optional)" }]
}
Constraints:
- 1 root (level 0), 4-7 branches (level 1), 2-4 leaves per branch (level 2) => 12-22 nodes total
- Labels concise, summaries clear
- Edges from root to branches, branches to leaves
- Keep Web3 terms explained simply if present
`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Title hint: ${title ?? 'Untitled'}\n\nSource:\n${sourceText.slice(0, 12000)}` },
        ],
        temperature: 0.3,
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

    // Light validation
    const asObj = json as { title?: string; nodes?: unknown[]; edges?: unknown[] };
    if (!Array.isArray(asObj.nodes) || !Array.isArray(asObj.edges)) {
      return res.status(502).json({ error: 'Model returned invalid shape', raw: raw.slice(0, 1000) });
    }

    return res.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
