// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

import { scanSecurity } from './safety.js';

// Server-only API Keys (read dynamically inside handler to avoid ESM import hoisting issues)

const ALLOWED_ORIGINS = [
  'https://gaid3.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

// Simple in-memory rate limit
const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30; // req per minute per IP
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

function cleanAiOutput(text: string): string {
  let cleaned = text;
  if (cleaned.includes('<think>')) {
    const end = cleaned.lastIndexOf('</think>');
    if (end >= 0) cleaned = cleaned.slice(end + 8);
  }
  if (cleaned.includes("Here's a thinking process:")) {
    const firstBlank = cleaned.indexOf('\n\n');
    if (firstBlank >= 0) cleaned = cleaned.slice(firstBlank + 2);
  }
  if (cleaned.includes('Final answer:')) {
    const end = cleaned.lastIndexOf('Final answer:');
    if (end >= 0) cleaned = cleaned.slice(end + 13);
  }
  return cleaned.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

  // CORS
  const origin = req.headers.origin as string;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
  }

  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      parsedBody = {};
    }
  }

  const { message, context, history } = (parsedBody || {}) as {
    message?: string;
    context?: string;
    history?: Array<{ role: string; content: string }>;
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: 'Message too long (max 4000 characters)' });
  }

  // 1. Safety Pre-Flight Assessment
  const safety = scanSecurity(message);
  if (safety.isCritical) {
    return res.json({
      reply: `🛡️ **Safety Guardian Pause**: ${safety.warnings[0]}\n\n${safety.recommendation}\n\n**Next Safe Step**: ${safety.safeNextStep}`,
      safetyNotice: true,
      safetyAssessment: safety,
      model: 'safety-guardian',
    });
  }

  // Guardrail against prompt extraction
  const lower = message.toLowerCase();
  if (lower.includes('ignore previous') || lower.includes('system prompt') || lower.includes('reveal instructions')) {
    return res.json({
      reply: "I'm Gaid3 — your calm, patient Web3 guide powered by Walrus Memory. How can I help you safely navigate Web3 today?",
      model: 'guardrail',
    });
  }

  const systemPrompt = `You are Gaid3 — a calm, patient, highly practical Web3 Onboarding AI Agent powered by Walrus Memory on the Sui Network.
Your Mission: Make Web3 feel sovereign, safe, and zero-fear. Never make the user feel stupid. Keep explanations concise, empathetic, and encouraging. Use numbered bullet points for sequential steps.
SECURITY RULE: NEVER ask for seed phrases, private keys, or recovery words.
Walrus Memory Context:
${context || 'First session: welcoming new Web3 explorer.'}
Conversation History:
${(history || []).slice(-6).map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;

  // 2. Multi-Provider Fallback Cascade
  // Cascade order: Groq -> OpenRouter -> Mistral -> Gemini -> Offline heuristic

  // Cascade Option A: Groq
  if (GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.6,
          max_tokens: 1200,
        }),
      });

      if (groqRes.ok) {
        const data = (await groqRes.json()) as any;
        const rawReply = data.choices?.[0]?.message?.content;
        if (rawReply) {
          return res.json({
            reply: cleanAiOutput(rawReply),
            model: 'qwen/qwen3.8-27b',
            provider: 'groq',
          });
        }
      }
    } catch (e) {
      console.warn('Groq failed, falling back to OpenRouter...', e);
    }
  }

  // Cascade Option B: OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://gaid3.vercel.app',
          'X-Title': 'Gaid3 Web3 Agent',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.6,
          max_tokens: 1200,
        }),
      });

      if (orRes.ok) {
        const data = (await orRes.json()) as any;
        const rawReply = data.choices?.[0]?.message?.content;
        if (rawReply) {
          return res.json({
            reply: cleanAiOutput(rawReply),
            model: 'openai/gpt-4o-mini',
            provider: 'openrouter',
          });
        }
      }
    } catch (e) {
      console.warn('OpenRouter failed, falling back to Mistral...', e);
    }
  }

  // Cascade Option C: Mistral
  if (MISTRAL_API_KEY) {
    try {
      const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.6,
          max_tokens: 1200,
        }),
      });

      if (mistralRes.ok) {
        const data = (await mistralRes.json()) as any;
        const rawReply = data.choices?.[0]?.message?.content;
        if (rawReply) {
          return res.json({
            reply: cleanAiOutput(rawReply),
            model: 'mistral-small-latest',
            provider: 'mistral',
          });
        }
      }
    } catch (e) {
      console.warn('Mistral failed, falling back to Gemini...', e);
    }
  }

  // Cascade Option D: Google Gemini
  if (GEMINI_API_KEY) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: message }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
          }),
        }
      );

      if (geminiRes.ok) {
        const gData: any = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return res.json({ reply: cleanAiOutput(text), model: 'gemini-1.5-flash', provider: 'gemini' });
        }
      }
    } catch (e) {
      console.warn('Gemini failed, falling back to heuristic offline engine...', e);
    }
  }

  // Cascade Option E: Empathetic Heuristic Offline Guide
  const fallback = lower.includes('wallet') || lower.includes('create')
    ? "Setting up your Sui Wallet safely:\n1. Download exclusively from official sources (sui.io or chrome web store)\n2. Generate a secure local password\n3. Record your 12 recovery words on paper (no screenshots, no cloud notes)\n4. Verify your backup. Would you like to practice in the Safety Sandbox?"
    : lower.includes('walrus')
    ? "Walrus Protocol is a decentralized blob storage network built on Sui. Gaid3 uses Walrus to store your learning progress, verified checklists, and risk preferences so your context stays sovereign and private across devices."
    : "I hear you — I've recorded this in your Walrus memory profile. We will take every Web3 step at your pace. What would you like to explore next?";

  return res.json({
    reply: fallback,
    model: 'fallback-offline',
    provider: 'local-heuristic',
  });
}
