// Vercel types inlined — no extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string,string | string[] | undefined>; query?: Record<string,string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n:number)=>VercelResponse; json: (o:unknown)=>VercelResponse; setHeader:(k:string,v:string)=>void; end:()=>void; };
import { z } from 'zod';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPEN_NOTEBOOK_URL = process.env.OPEN_NOTEBOOK_URL?.replace(/\/$/, '');
const OPEN_NOTEBOOK_PASSWORD = process.env.OPEN_NOTEBOOK_PASSWORD;

const BodySchema = z.object({
  history: z.array(z.object({ role: z.string(), content: z.string() })).max(50).default([]),
  walrusFacts: z.array(z.object({ category: z.string(), statement: z.string() })).optional(),
  walrusBlobId: z.string().max(200).optional(),
  walrusChecklists: z.array(z.object({ title: z.string() })).optional(),
  walrusMistakes: z.array(z.object({ remedyLesson: z.string() })).optional(),
  experienceLevel: z.string().optional(),
  riskTolerance: z.string().optional(),
  type: z.enum(['mindmap','flashcards','quiz','summary','podcast','ask','search']),
  title: z.string().max(120).optional(),
  question: z.string().max(500).optional(), // for ask/search
  count: z.number().int().min(3).max(30).optional(),
});

function buildSourceText(data: z.infer<typeof BodySchema>): string {
  const facts = (data.walrusFacts || []).map(f => `[${f.category}] ${f.statement}`).join('\n');
  const checklists = (data.walrusChecklists || []).map(c => c.title).join(', ');
  const mistakes = (data.walrusMistakes || []).map(m => m.remedyLesson).join(' | ');
  const convo = (data.history || []).map(m => `${m.role}: ${m.content}`).join('\n');
  const header = [
    `Experience: ${data.experienceLevel || 'unknown'} | Risk: ${data.riskTolerance || 'unknown'}`,
    facts ? `WALRUS MEMORY FACTS:\n${facts}` : '',
    checklists ? `Completed Checklists: ${checklists}` : '',
    mistakes ? `Lessons from mistakes: ${mistakes}` : '',
    data.walrusBlobId ? `Walrus Blob: ${data.walrusBlobId}` : '',
  ].filter(Boolean).join('\n');
  const source = `${header}\n\nCONVERSATION:\n${convo}`.trim().slice(0, 18000);
  return source.length < 20 ? convo.slice(0, 18000) : source;
}

async function tryOpenNotebook(sourceText: string, type: string, question?: string) {
  if (!OPEN_NOTEBOOK_URL || !OPEN_NOTEBOOK_PASSWORD) return null;
  try {
    // Use open-notebook transformations for structured types
    const headers = { Authorization: `Bearer ${OPEN_NOTEBOOK_PASSWORD}`, 'Content-Type': 'application/json' };
    if (type === 'ask' || type === 'search') {
      const endpoint = type === 'ask' ? '/api/ask' : '/api/search';
      const body = type === 'ask' ? { question: question || sourceText.slice(0,500), notebook_id: undefined } : { query: question || sourceText.slice(0,500) };
      const r = await fetch(`${OPEN_NOTEBOOK_URL}${endpoint}`, { method:'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) return null;
      return { source: 'open-notebook', data: await r.json() };
    }
    // For others, we rely on Groq fallback unless open-notebook transformations are pre-created
    return null;
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  if (!data.history.length && !(data.walrusFacts || []).length) {
    return res.status(400).json({ error: 'Provide history or walrusFacts' });
  }

  const sourceText = buildSourceText(data);

  // Try open-notebook first for ask/search
  if ((data.type === 'ask' || data.type === 'search') && OPEN_NOTEBOOK_URL) {
    const ob = await tryOpenNotebook(sourceText, data.type, data.question);
    if (ob) return res.json(ob);
  }

  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'AI not configured. Set GROQ_API_KEY in Vercel env. For open-notebook, also set OPEN_NOTEBOOK_URL + OPEN_NOTEBOOK_PASSWORD.' });
  }

  // Groq fallback prompts per type
  const prompts: Record<string, string> = {
    mindmap: `You are a mind-map generator for Gaid3. Output ONLY valid JSON (no markdown, no thinking).\nShape: {"title":"string","nodes":[{"id":"n1","label":"2-5 words","level":0,"summary":"one sentence"}],"edges":[{"from":"n1","to":"n2","label":"relation"}]}\nConstraints: 1 root level0, 4-7 branches level1, 2-4 leaves per branch level2 = 12-22 nodes. Web3 terms explained simply.`,
    flashcards: `You are a flashcard generator for Gaid3. Output ONLY valid JSON (no markdown).\nShape: {"cards":[{"id":"c1","front":"question","back":"answer 1-3 sentences","hint":"optional","tag":"topic"}]}\nRequirements: Exactly ${data.count || 12} cards, mix definition/why-how/scenario/mistake. Web3 safety angle. Plain ASCII.`,
    quiz: `You are a quiz generator for Gaid3. Output ONLY valid JSON (no markdown).\nShape: {"quiz":[{"id":"q1","question":"...","options":["a","b","c","d"],"answer":"b","explanation":"1 sentence","difficulty":"beginner"}]}\nRequirements: ${data.count || 5} MCQs from source, 4 options each, one correct, include citations from Walrus facts.`,
    summary: `You are a summarizer for Gaid3. Output ONLY valid JSON (no markdown).\nShape: {"summary":"200-300 word overview","keyPoints":["point1","point2"],"takeaways":["action1","action2"],"citations":["fact used"]}\nBe concise, Web3 onboarding focus.`,
    podcast: `You are a podcast script generator for Gaid3. Output ONLY valid JSON (no markdown).\nShape: {"title":"episode title","outline":["segment1","segment2"],"script":[{"speaker":"Host","line":"..."},{"speaker":"Expert","line":"..."}]}\n2 speakers, 6-8 turns, calm patient tone, Walrus memory references.`,
    ask: `You are Gaid3 answering from Walrus memory + conversation. Answer the question using ONLY provided context. Cite facts as [category]. If unknown, say so.\nQuestion: ${data.question || 'Summarize what was learned'}`,
    search: `You are a search helper. Given query "${data.question || ''}", return most relevant snippets from source as JSON: {"results":[{"snippet":"...","relevance":0.9,"source":"memory|conversation"}]}`,
  };

  const systemPrompt = prompts[data.type] || prompts.summary;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'groq/compound-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Title: ${data.title || 'Gaid3 Learning'}\n\nSource:\n${sourceText.slice(0,12000)}${data.question ? `\n\nQuestion: ${data.question}` : ''}` },
        ],
        temperature: data.type === 'mindmap' ? 0.3 : 0.4,
        response_format: data.type !== 'ask' && data.type !== 'search' ? { type: 'json_object' } : undefined,
      }),
    });
    if (!groqRes.ok) {
      const t = await groqRes.text();
      return res.status(502).json({ error: `Groq error ${groqRes.status}`, detail: t.slice(0,400) });
    }
    const j = (await groqRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = j.choices?.[0]?.message?.content ?? '{}';
    // Try parse JSON, fallback to raw for ask/search
    if (data.type === 'ask' || data.type === 'search') {
      // ask/search may be plain text — return as is
      try { return res.json(JSON.parse(raw)); } catch { return res.json({ answer: raw, source: 'groq' }); }
    }
    let jsonStr = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const fb = jsonStr.indexOf('{'); const lb = jsonStr.lastIndexOf('}');
    if (fb >=0 && lb > fb) jsonStr = jsonStr.slice(fb, lb+1);
    jsonStr = jsonStr.replace(/,\s*([}\]])/g,'$1');
    try {
      const parsedJson = JSON.parse(jsonStr);
      return res.json({ source: 'groq', data: parsedJson, raw: undefined });
    } catch {
      return res.status(502).json({ error: 'Model returned invalid JSON', raw: raw.slice(0,1000) });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
