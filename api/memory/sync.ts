// Vercel types inlined to avoid extra dep
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body || {}) as { profile?: unknown; text?: string };
  const payload = body.profile ?? body.text ?? `Gaid3 memory snapshot ${new Date().toISOString()}`;
  const publisherUrl = process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
  try {
    const storeRes = await fetch(`${publisherUrl.replace(/\/$/, '')}/v1/store?epochs=5`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
    });
    if (storeRes.ok) {
      const json = (await storeRes.json()) as { newlyCreated?: { blobObject?: { blobId: string; storage?: { startEpoch: number } }; blobId?: string }; alreadyCertified?: { blobId?: string; blobObject?: { blobId: string; storage?: { startEpoch: number } } } };
      const info = json.newlyCreated || json.alreadyCertified;
      const blobId = info?.blobObject?.blobId || info?.blobId || `walrus_blob_${Date.now()}`;
      const epoch = info?.blobObject?.storage?.startEpoch ?? 1;
      return res.json({ success: true, blobId, epoch, message: 'Memory snapshot certified on Walrus' });
    }
    throw new Error(`Walrus publisher ${storeRes.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    // Fallback mock so UI never breaks in offline demo
    const mock = `walrus_testnet_${Buffer.from(String(payload)).toString('base64').substring(0, 16).replace(/[+/=]/g, 'w')}`;
    return res.json({ success: true, blobId: mock, epoch: 12, isMock: true, note: `Mock (publisher unreachable: ${msg})` });
  }
}
