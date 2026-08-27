// Vercel types inlined
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

const ENOKI_API_KEY = process.env.ENOKI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body || {}) as { action: 'get-salt'; token: string };

  if (body.action !== 'get-salt') {
    return res.status(400).json({ error: 'Invalid action. Only get-salt supported.' });
  }

  if (!ENOKI_API_KEY) {
    // Demo fallback: return deterministic salt from token (not secure for production)
    const fallbackSalt = '0x' + Buffer.from(body.token.slice(0, 32)).toString('hex');
    return res.json({ salt: fallbackSalt, source: 'demo-fallback', warning: 'ENOKI_API_KEY not configured — using demo salt. Do not use in production.' });
  }

  try {
    // Try Enoki API v1 endpoint
    const enokiRes = await fetch('https://api.enoki.mystenlabs.com/v1/get-salt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ENOKI_API_KEY },
      body: JSON.stringify({ jwt: body.token }),
    });

    if (!enokiRes.ok) {
      const err = await enokiRes.text();
      // Fallback to demo salt
      const fallbackSalt = '0x' + Buffer.from(body.token.slice(0, 32)).toString('hex');
      return res.json({ salt: fallbackSalt, source: 'demo-fallback', warning: `Enoki error ${enokiRes.status}: ${err.slice(0, 200)}` });
    }

    const data = (await enokiRes.json()) as { salt: string; address?: string };
    return res.json({ salt: data.salt, source: 'enoki', address: data.address });
  } catch (err) {
    const fallbackSalt = '0x' + Buffer.from(body.token.slice(0, 32)).toString('hex');
    return res.json({ salt: fallbackSalt, source: 'demo-fallback', warning: `Enoki request failed: ${err instanceof Error ? err.message : 'Unknown'}` });
  }
}