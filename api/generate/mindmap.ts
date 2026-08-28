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

  const systemPrompt = `You are a mind-map generator for Gaid3. Output ONLY valid JSON (no thinking, no markdown, no text, no explanations). 
Shape:
{
  "title": "string",
  "nodes": [{ "id": "n1", "label": "short label (2-5 words)", "level": 0, "summary": "one-sentence" }],
  "edges": [{ "from": "n1", "to": "n2", "label": "relation" }]
}
Constraints: 1 root (level 0), 4-7 branches (level 1), 2-4 leaves per branch (level 2) = 12-22 nodes. Web3 terms explained simply.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'groq/compound-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Title hint: ${title ?? 'Untitled'}\n\nSource:\n${sourceText.slice(0, 12000)}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      const t = await groqRes.text();
      return res.status(502).json({ error: `Groq error ${groqRes.status}`, detail: t.slice(0, 400) });
    }
    const data = (await groqRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    
    // Robust JSON extraction for qwen (handles markdown, extra text, thinking, etc.)
    let jsonStr = raw.trim();
    // Remove markdown fences
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    // Strip qwen3 thinking output
    if (jsonStr.includes("Here's a thinking process:") || jsonStr.includes('thinking process')) {
      const thinkEnd = jsonStr.lastIndexOf('\n\n');
      const processEnd = jsonStr.lastIndexOf('Final answer:');
      let cutIndex = -1;
      if (thinkEnd >= 0) cutIndex = thinkEnd + 2;
      else if (processEnd >= 0) cutIndex = processEnd + 13;
      if (cutIndex >= 0 && cutIndex < jsonStr.length) {
        jsonStr = jsonStr.slice(cutIndex).trim();
      }
    }
    // Find first { and last }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    // Fix common JSON issues
    jsonStr = jsonStr
      .replace(/,\s*([}\]])/g, '$1')  // trailing commas
      .replace(/(['"]?)([a-zA-Z_][a-zA-Z0-9_]*)(['"]?)\s*:/g, '"$2":');  // unquoted keys
    
    let json;
    try {
      json = JSON.parse(jsonStr);
    } catch {
      // Fallback: return structured error with raw
      return res.status(502).json({ error: 'Model returned invalid JSON', raw: raw.slice(0, 1000) });
    }

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