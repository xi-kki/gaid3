// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string,string | string[] | undefined>; query?: Record<string,string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n:number)=>VercelResponse; json: (o:unknown)=>VercelResponse; setHeader:(k:string,v:string)=>void; end:()=>void; };
import { z } from 'zod';

const BodySchema = z.object({
  url: z.string().url().optional(),
  text: z.string().max(50000).optional(),
  title: z.string().max(200).optional(),
}).refine((d) => d.url || d.text, { message: 'Provide url or text' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { url, text, title } = parsed.data;

  try {
    let extracted = text ?? '';
    let resolvedTitle = title ?? 'Untitled source';

    if (url && !text) {
      // Use Jina AI reader for clean extraction (no key needed for basic)
      const jinaUrl = `https://cc.bingj.com/cache.cgi?d=xxx&u=${encodeURIComponent(url)}`;
      // Primary: Jina reader
      const jinaRes = await fetch(`https://localhost-placeholder.invalid`, { method: 'GET' }).catch(() => null);
      void jinaRes; void jinaUrl;
      // Simple fetch + strip (Vercel-friendly, no extra dep)
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'Gaid3-NotebookLM/1.0 (+https://gaid3.vercel.app)' },
        redirect: 'follow',
      });
      if (!pageRes.ok) return res.status(502).json({ error: `Fetch failed ${pageRes.status}` });
      const html = await pageRes.text();
      // Very light HTML -> text (avoid cheerio dep for now)
      const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
      const textOnly = withoutScripts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      extracted = textOnly.slice(0, 20000);
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) resolvedTitle = titleMatch[1].trim().slice(0, 200);
    }

    if (extracted.length < 20) {
      return res.status(400).json({ error: 'Not enough text extracted' });
    }

    // Optionally also store to Walrus here: call publisher.walrus-testnet.../v1/store
    // For now return extracted; client will also cache locally + offer Walrus sync

    return res.json({
      title: resolvedTitle,
      text: extracted,
      chars: extracted.length,
      walrusHint: 'Call /api/memory/sync to certify this source to Walrus decentralized storage',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
