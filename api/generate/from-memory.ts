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
  type: z.enum(['mindmap','flashcards','quiz','summary','podcast','ask','search','simplify']),
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

async function tryOpenNotebook(sourceText: string, type: string, question?: string): Promise<unknown | null> {
  if (!OPEN_NOTEBOOK_URL || !OPEN_NOTEBOOK_PASSWORD) return null;
  try {
    const headers = { Authorization: `Bearer ${OPEN_NOTEBOOK_PASSWORD}`, 'Content-Type': 'application/json' };

    // Step 1: Create a notebook — NotebookCreate uses { name, description }
    const nbRes = await fetch(`${OPEN_NOTEBOOK_URL}/api/notebooks`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: `Gaid3 ${type} — ${new Date().toISOString().slice(0,10)}`, description: 'Gaid3 Walrus Memory context' }),
    });
    if (!nbRes.ok) return null;
    const notebook = await nbRes.json() as { id?: string };
    const notebookId = notebook.id;
    if (!notebookId) return null;

    // Step 2: Create source via /api/sources/json — type: text with notebooks association
    const srcRes = await fetch(`${OPEN_NOTEBOOK_URL}/api/sources/json`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'text', content: sourceText, title: 'Gaid3 Memory Context', notebooks: [notebookId] }),
    });
    if (!srcRes.ok) return null;
    const source = await srcRes.json() as { id?: string };
    const sourceId = source.id;
    if (!sourceId) return null;

    // Chat-based types use source-level chat: POST /api/sources/{id}/chat/sessions then /messages
    const chatTypes = ['ask', 'search', 'summary', 'simplify'];
    if (chatTypes.includes(type)) {
      const sessRes = await fetch(`${OPEN_NOTEBOOK_URL}/api/sources/${encodeURIComponent(sourceId)}/chat/sessions`, {
        method: 'POST', headers,
        body: JSON.stringify({ source_id: sourceId, title: 'Gaid3 Chat' }),
      });
      if (!sessRes.ok) return null;
      const session = await sessRes.json() as { id?: string };
      const sessionId = session.id;
      if (!sessionId) return null;

      const chatPrompts: Record<string, string> = {
        ask: question || 'Summarize what was learned from the source',
        search: `Find the most relevant snippets about: ${question || ''}`,
        summary: 'Summarize this content concisely with key points and takeaways.',
        simplify: `Explain this Web3 content in simple terms for a beginner audience. Avoid jargon, focus on why it matters. Question: ${question || ''}`,
      };
      const msgRes = await fetch(`${OPEN_NOTEBOOK_URL}/api/sources/${encodeURIComponent(sourceId)}/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({ message: chatPrompts[type] || chatPrompts.ask }),
      });
      if (!msgRes.ok) return null;
      // source_chat messages endpoint streams or returns JSON — handle both
      const text = await msgRes.text();
      let answer = text;
      try {
        const parsed = JSON.parse(text) as { content?: string; answer?: string; message?: string };
        answer = parsed.content || parsed.answer || parsed.message || text;
      } catch { /* plain text */ }
      // If response is SSE stream, extract last content
      if (answer.includes('data:')) {
        const lines = answer.split('\n').filter(l => l.startsWith('data:'));
        try {
          const last = JSON.parse(lines[lines.length-1].slice(5).trim()) as { content?: string };
          answer = last.content || answer;
        } catch { /* keep raw */ }
      }
      if (type === 'search') {
        return { source: 'open-notebook', results: [{ snippet: answer, relevance: 1.0, source: 'notebook' }] };
      }
      return { source: 'open-notebook', answer, transcript: [{ role: 'assistant', content: answer }] };
    }

    // Transformation types: use POST /api/transformations/execute with input_text
    // First, resolve transformation IDs by name via GET /api/transformations
    const tfMap: Record<string, string> = { mindmap: 'mind map', flashcards: 'flashcards', quiz: 'quiz', podcast: 'podcast' };
    const wanted = (tfMap[type] || type).toLowerCase();
    const listRes = await fetch(`${OPEN_NOTEBOOK_URL}/api/transformations`, { headers });
    if (!listRes.ok) return null;
    const tfs = await listRes.json() as Array<{ id: string; name: string; title: string }>;
    const tf = tfs.find(t => t.name.toLowerCase() === wanted || t.title.toLowerCase() === wanted || t.name.toLowerCase().includes(wanted));
    if (!tf) return null;
    const execRes = await fetch(`${OPEN_NOTEBOOK_URL}/api/transformations/execute`, {
      method: 'POST', headers,
      body: JSON.stringify({ transformation_id: tf.id, input_text: sourceText }),
    });
    if (!execRes.ok) return null;
    const exec = await execRes.json() as { output?: string };
    if (!exec.output) return null;
    // Parse transformation output — try JSON, else wrap as answer
    try {
      const parsed = JSON.parse(exec.output);
      return { source: 'open-notebook', ...parsed, raw: exec.output };
    } catch {
      return { source: 'open-notebook', answer: exec.output, raw: exec.output };
    }
  } catch {
    return null;
  }
}

function generateOfflineFallback(data: z.infer<typeof BodySchema>, sourceText: string): unknown {
  const { type, count, title, question, walrusFacts } = data;
  switch (type) {
    case 'mindmap':
      return {
        source: 'offline-fallback',
        data: {
          title: title || 'Web3 Onboarding Mind Map',
          nodes: [
            { id: 'n1', label: 'Web3 Onboarding', level: 0, summary: 'Your journey with Gaid3' },
            { id: 'n2', label: 'Wallet Setup', level: 1, summary: 'Installing and securing a crypto wallet' },
            { id: 'n3', label: 'Sui Blockchain', level: 1, summary: 'Fast L1 with low fees' },
            { id: 'n4', label: 'Walrus Storage', level: 1, summary: 'Decentralized blob storage' },
            { id: 'n5', label: 'Safety First', level: 1, summary: 'Avoiding scams and bad approvals' },
            { id: 'n6', label: 'Paper Backup', level: 2, summary: 'Write seed phrase on physical paper' },
            { id: 'n7', label: 'Verify URLs', level: 2, summary: 'Only use official bookmarked links' },
            { id: 'n8', label: 'SUI Tokens', level: 2, summary: 'Native gas token for transactions' },
            { id: 'n9', label: 'Blob ID', level: 2, summary: 'Unique identifier for stored data' },
            { id: 'n10', label: 'Test Net First', level: 2, summary: 'Try swaps with small amounts' },
          ],
          edges: [
            { from: 'n1', to: 'n2', label: 'starts with' },
            { from: 'n1', to: 'n3', label: 'learns' },
            { from: 'n1', to: 'n4', label: 'stores in' },
            { from: 'n1', to: 'n5', label: 'follows' },
            { from: 'n2', to: 'n6', label: 'requires' },
            { from: 'n2', to: 'n7', label: 'warns about' },
            { from: 'n3', to: 'n8', label: 'uses' },
            { from: 'n4', to: 'n9', label: 'produces' },
            { from: 'n5', to: 'n10', label: 'advises' },
          ],
        },
      };

    case 'flashcards': {
      const num = count || 12;
      const cards = [];
      const templates = [
        { front: 'What is a seed phrase?', back: 'A 12 or 24-word recovery phrase that lets you restore your wallet. Never share it with anyone.', hint: 'It is the ultimate backup', tag: 'wallet' },
        { front: 'Why avoid unlimited token approvals?', back: 'Unlimited approvals let a contract spend all your tokens. Always approve the exact amount needed.', hint: 'Unlimited = dangerous', tag: 'safety' },
        { front: 'What is Sui?', back: 'A fast, low-fee layer-1 blockchain using Move language and object-centric architecture.', hint: 'Layer-1', tag: 'sui' },
        { front: 'What is Walrus Protocol?', back: 'A decentralized storage protocol on Sui that stores data as blobs across storage nodes.', hint: 'Blob storage', tag: 'walrus' },
        { front: 'Should I screenshot my seed phrase?', back: 'Never. Store seed phrases on physical paper in a secure, fire/water-resistant location only.', hint: 'Paper only', tag: 'safety' },
        { front: 'What is slippage tolerance?', back: 'The maximum price change you accept between order and execution. Keep it low (0.5-1%) for stable coins.', hint: 'Price buffer', tag: 'defi' },
        { front: 'What is zkLogin?', back: 'A Sui feature that lets you log in with Google OAuth without a seed phrase, using zero-knowledge proofs.', hint: 'Seedless auth', tag: 'zklogin' },
        { front: 'How to verify a token address?', back: 'Check the contract address on Suiscan or Etherscan — never search by ticker alone.', hint: 'Use official explorers', tag: 'safety' },
      ];
      for (let i = 0; i < num; i++) {
        const t = templates[i % templates.length];
        cards.push({ id: `c${i + 1}`, front: t.front, back: t.back, hint: t.hint, tag: t.tag });
      }
      return { source: 'offline-fallback', data: { cards }, raw: null };
    }

    case 'quiz': {
      const num = count || 5;
      const pool = [
        { id: 'q1', question: 'What should you NEVER do with your seed phrase?', options: ['Write on paper', 'Screenshot it', 'Store in a safe', 'Memorize part of it'], answer: 'b', explanation: 'Screenshots and digital copies are easily stolen.', difficulty: 'beginner' },
        { id: 'q2', question: 'What does Sui use as its native gas token?', options: ['ETH', 'SOL', 'SUI', 'BTC'], answer: 'c', explanation: 'SUI pays for gas and staking on the Sui network.', difficulty: 'beginner' },
        { id: 'q3', question: 'What is the safest slippage tolerance for stablecoin swaps?', options: ['0.5-1%', '5-10%', '50%', 'No slippage'], answer: 'a', explanation: 'Low slippage protects against MEV and price impact.', difficulty: 'intermediate' },
        { id: 'q4', question: 'What does Walrus Protocol store data as?', options: ['Blocks', 'Blobs', 'Pages', 'Records'], answer: 'b', explanation: 'Data is stored as erasure-coded blobs across storage nodes.', difficulty: 'intermediate' },
        { id: 'q5', question: 'What is zkLogin?', options: ['A wallet type', 'Google OAuth for Sui without seed phrase', 'A token', 'A DeFi protocol'], answer: 'b', explanation: 'zkLogin enables seedless wallet creation via Google OAuth.', difficulty: 'beginner' },
      ];
      const quiz = pool.slice(0, Math.min(num, pool.length));
      return { source: 'offline-fallback', data: { quiz }, raw: null };
    }

    case 'summary':
      return {
        source: 'offline-fallback',
        data: {
          summary: 'Gaid3 is a Web3 onboarding AI agent that uses Walrus decentralized storage to remember your experience level, preferred chains, and past mistakes. It provides step-by-step guidance for wallet setup, safe swapping, and understanding protocols like Sui and Walrus. Safety is prioritized with pre-flight checks for seed phrase leakage, unlimited approvals, and phishing URLs.',
          keyPoints: [
            'Walrus Protocol provides decentralized, permanent storage for user memory blobs',
            'Sui is a fast, low-fee layer-1 blockchain using Move language',
            'zkLogin enables seedless wallet creation via Google OAuth',
            'Safety checks cover seed phrases, unlimited approvals, phishing, and gas reserves',
          ],
          takeaways: [
            'Always backup seed phrases on physical paper only',
            'Use exact approval amounts instead of unlimited',
            'Verify token addresses on official block explorers',
            'Leave gas tokens for future transactions',
          ],
          citations: walrusFacts?.map(f => `[${f.category}] ${f.statement}`).slice(0, 5) || [],
        },
        raw: null,
      };

    case 'podcast':
      return {
        source: 'offline-fallback',
        data: {
          title: title || 'Web3 Onboarding 101 with Gaid3',
          outline: ['What is Web3?', 'Setting up your first wallet', 'Sui and Walrus basics', 'Staying safe from scams'],
          script: [
            { speaker: 'Host', line: 'Welcome to Gaid3, your calm Web3 guide. Today we cover onboarding basics.' },
            { speaker: 'Expert', line: 'The most important step is securing your seed phrase — write it on paper, never screenshot it.' },
            { speaker: 'Host', line: 'What about unlimited token approvals?' },
            { speaker: 'Expert', line: 'Always approve the exact amount needed. Unlimited approvals are a common attack vector.' },
          ],
        },
        raw: null,
      };

    case 'ask':
      return {
        source: 'offline-fallback',
        answer: `Based on your Walrus Memory and conversation with Gaid3, here's what I know:\n\n${walrusFacts && walrusFacts.length ? walrusFacts.map((f: { category: string; statement: string }) => `- [${f.category}] ${f.statement}`).join('\n') : '- No specific facts stored yet'}.\n\n${question ? `Regarding "${question}": Always verify on official docs and start with small test amounts.` : 'What specific Web3 topic would you like me to explain?'}`,
      };

    case 'search':
      return {
        source: 'offline-fallback',
        results: [
          { snippet: 'Always write seed phrases on physical paper. Never screenshot or store digitally.', relevance: 0.95, source: 'memory' },
          { snippet: 'Unlimited token approvals allow contracts to drain your wallet.', relevance: 0.9, source: 'memory' },
          { snippet: 'Verify token addresses on official block explorers before swapping.', relevance: 0.85, source: 'memory' },
          { snippet: 'Leave at least 0.5 SUI for gas fees at all times.', relevance: 0.8, source: 'memory' },
        ].filter(r => !question || r.snippet.toLowerCase().includes(question.toLowerCase().slice(0, 5))),
      };

    case 'simplify':
      return {
        source: 'offline-fallback',
        answer: `Based on your question: "${question || 'Explain this concept'}"\n\nIn simple terms: This is about keeping your crypto safe. Think of it like a bank vault, but instead of a bank, it's your personal responsibility. The most important rules:\n\n1. Never share your recovery phrase (12 words) with anyone — not even support\n2. Only install wallets from official websites (sui.io, not a Google ad)\n3. When swapping tokens, always check the token address on the official explorer\n4. Keep a small amount of SUI for gas fees (like car fuel — you need it to move)\n\n${walrusFacts && walrusFacts.length ? 'Your stored facts: ' + walrusFacts.slice(0,3).map(f => `[${f.category}] ${f.statement}`).join('; ') : ''}`,
      };
    default:
      return { source: 'offline-fallback', data: { summary: sourceText.slice(0, 300) }, raw: null };
  }
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

  // Try open-notebook for all types (upgrade path when OPEN_NOTEBOOK_URL is configured)
  if (OPEN_NOTEBOOK_URL) {
    const ob = await tryOpenNotebook(sourceText, data.type, data.question);
    if (ob) return res.json(ob);
  }

  if (!GROQ_API_KEY) {
    // Offline fallback: return deterministic mock data so the NotebookLM Studio
    // remains usable without API keys. Real AI generation kicks in once GROQ_API_KEY is set.
    return res.json(generateOfflineFallback(data, sourceText));
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
    simplify: `You are Gaid3 explaining Web3 concepts simply. Explain like you're teaching a teenager. Use analogies, avoid jargon, and focus on why it matters. Answer as plain text, not JSON.\nQuestion: ${data.question || 'Explain this concept'}`,
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
        response_format: data.type !== 'ask' && data.type !== 'search' && data.type !== 'simplify' ? { type: 'json_object' } : undefined,
      }),
    });
    if (!groqRes.ok) {
      const t = await groqRes.text();
      return res.status(502).json({ error: `Groq error ${groqRes.status}`, detail: t.slice(0,400) });
    }
    const j = (await groqRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = j.choices?.[0]?.message?.content ?? '{}';
    // Try parse JSON, fallback to raw for ask/search
    if (data.type === 'ask' || data.type === 'search' || data.type === 'simplify') {
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
