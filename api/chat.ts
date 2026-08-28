// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string,string | string[] | undefined>; query?: Record<string,string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n:number)=>VercelResponse; json: (o:unknown)=>VercelResponse; setHeader:(k:string,v:string)=>void; end:()=>void; };

// Server-only — NEVER prefix with VITE_ or NEXT_PUBLIC_
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ALLOWED_ORIGINS = [
  'https://gaid3.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

// Simple in-memory rate limit (resets on cold start — use Upstash Redis for prod)
const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 20; // req per minute per IP
const WINDOW_MS = 60_000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers.origin as string;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
  }

  const { message, context, history } = (req.body || {}) as { message?: string; context?: string; history?: Array<{ role: string; content: string }> };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: 'Message too long (max 4000 chars)' });
  }

  // Sanitize — block seed phrase extraction attempts via system
  const lower = message.toLowerCase();
  if (lower.includes('ignore previous') || lower.includes('system prompt') || lower.includes('reveal your instructions')) {
    return res.json({
      reply: "I'm Gaid3 — I keep our conversation safe and on track. How can I help you explore Web3 securely today?",
      model: 'guardrail'
    });
  }

  const systemPrompt = `You are Gaid3 — a calm, patient, highly practical Web3 Onboarding AI Agent powered by Walrus Memory (Sui decentralized storage).
Mission: Make Web3 feel simple, safe, less scary. Never make user feel stupid. Concise, encouraging, actionable. Use bullets for steps.
NEVER ask for seed phrases, private keys, or recovery words. If user shares them, immediately warn them.
Current Walrus Memory Context:
${context || 'No prior context — first session, welcoming new user.'}
Conversation history (last 6 turns):
${(history || []).slice(-6).map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;

  try {
    // Prefer Groq, fallback to xAI, fallback to Gemini, fallback to empathetic static
    let endpoint = '';
    let apiKey = '';
    let model = '';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any = {};

    if (GROQ_API_KEY) {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      apiKey = GROQ_API_KEY;
      // Use available model on this account
      model = 'qwen/qwen3.6-27b';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = { model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], temperature: 0.6, max_tokens: 1200 };
    } else if (XAI_API_KEY) {
      endpoint = 'https://api.x.ai/v1/chat/completions';
      apiKey = XAI_API_KEY;
      model = 'grok-2-latest';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = { model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], temperature: 0.6, max_tokens: 1200 };
    } else if (GEMINI_API_KEY) {
      // Gemini fallback via REST
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: message }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 1200 }
          })
        }
      );
      if (!geminiRes.ok) throw new Error(`Gemini error ${geminiRes.status}`);
      const gData: any = await geminiRes.json();
      const text = gData.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to guide you calmly through Web3 — what would you like to explore?";
      return res.json({ reply: text, model: 'gemini-1.5-flash' });
    } else {
      // No key configured — return empathetic fallback (still via server, no exposure)
      const fallback = message.toLowerCase().includes('wallet')
        ? "Let's set up your Sui Wallet step by step:\n1. Install only from sui.io / official store\n2. Set a strong local password\n3. Write 12 recovery words on PAPER (never screenshot)\nWould you like the full checklist?"
        : "I hear you — noted in your Walrus Memory. We'll take this one step at a time. What would you like to check next about Web3 or Walrus?";
      return res.json({ reply: fallback, model: 'fallback-offline' });
    }

    const groqRes = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Upstream AI error', groqRes.status, errText.slice(0, 500));
      return res.status(502).json({ error: `AI upstream error (${groqRes.status}). Try again in a moment.` });
    }
    const data: any = await groqRes.json();
    let reply = data.choices?.[0]?.message?.content || "I'm here with you — what would you like to explore next in Web3?";

    // Strip qwen3 thinking/reasoning output (everything before final answer)
    // qwen3 outputs thinking in formats like: "Here's a thinking process:\n...\n\nFinal answer:" or "<think>...</think>"
    if (reply.includes('Here\'s a thinking process:') || reply.includes('<think>') || reply.includes('thinking process')) {
      // Try to find the actual answer after thinking markers
      const thinkEnd = reply.lastIndexOf('</think>');
      const processEnd = reply.lastIndexOf('Final answer:');
      const hereEnd = reply.lastIndexOf('Here\'s a thinking process:');
      let cutIndex = -1;
      if (thinkEnd >= 0) cutIndex = thinkEnd + 8; // '</think>'.length
      else if (processEnd >= 0) cutIndex = processEnd + 13; // 'Final answer:'.length
      else if (hereEnd >= 0) cutIndex = hereEnd;
      if (cutIndex >= 0 && cutIndex < reply.length) {
        reply = reply.slice(cutIndex).trim();
      }
    }
    // Also handle "Here's a thinking process:\n\n" pattern
    if (reply.startsWith('Here\'s a thinking process:')) {
      const firstBlankLine = reply.indexOf('\n\n');
      if (firstBlankLine >= 0) {
        reply = reply.slice(firstBlankLine + 2).trim();
      }
    }

    return res.json({ reply, model });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
