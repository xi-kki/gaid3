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

  const systemPrompt = `You are a flashcard generator for Gaid3. Output ONLY valid JSON (no thinking, no markdown, no text, no code fences).
Shape: { "cards": [{ "id": "c1", "front": "question", "back": "answer (1-3 sentences)", "hint": "optional", "tag": "topic" }] }
Requirements: Exactly ${count} cards, difficulty ${difficulty}, mix definition/why-how/scenario/mistake. Web3 safety angle. Front=question, Back=answer. No special characters, plain ASCII only.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'groq/compound-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: sourceText.slice(0, 12000) },
        ],
        temperature: 0.4,
      }),
    });

    if (!groqRes.ok) {
      const t = await groqRes.text();
      return res.status(502).json({ error: `Groq error ${groqRes.status}`, detail: t.slice(0, 400) });
    }
    const data = (await groqRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    
    // Robust JSON extraction
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
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    // Fix common JSON issues + sanitize unicode chars that break JSON
    jsonStr = jsonStr
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/(['"]?)([a-zA-Z_][a-zA-Z0-9_]*)(['"]?)\s*:/g, '"$2":')
      .replace(/[\u2010-\u2015]/g, '-')  // en/em dashes to hyphen
      .replace(/[\u2018\u2019]/g, "'")   // smart quotes
      .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
      .replace(/[\u00A0]/g, ' ')         // non-breaking space
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))); // decode escaped unicode
    
    let json;
    try {
      json = JSON.parse(jsonStr);
    } catch {
      return res.status(502).json({ error: 'Model returned invalid JSON', raw: raw.slice(0, 1000) });
    }
    
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