// Vercel types inlined
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { actionText } = (req.body || {}) as { actionText?: string };
  if (!actionText) return res.status(400).json({ error: 'actionText is required' });

  const text = actionText.toLowerCase();
  let riskScore = 15;
  let warnings = ['Standard transaction.'];
  let recommendation = 'Verify recipient address + network fee before confirming.';

  if (text.includes('approve') || text.includes('unlimited')) {
    riskScore = 75;
    warnings = ['Unlimited token allowance requested by smart contract.'];
    recommendation = 'Only approve the exact amount needed for this single swap.';
  } else if (text.includes('seed') || text.includes('key') || text.includes('word') || text.includes('phrase')) {
    riskScore = 100;
    warnings = ['CRITICAL: Potential seed phrase or private key disclosure!'];
    recommendation = 'Stop immediately. Never paste secret phrases into websites or chat boxes.';
  }

  return res.json({ riskScore, warnings, recommendation });
}