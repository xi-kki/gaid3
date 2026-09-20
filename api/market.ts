/**
 * Market intelligence API using free public endpoints from the Public APIs registry:
 * - DefiLlama API (free, no auth, CORS enabled)
 * - Coinpaprika API (free, no auth, CORS enabled)
 */

type VercelReq = {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelRes = {
  status: (n: number) => VercelRes;
  json: (o: unknown) => VercelRes;
  setHeader: (k: string, v: string) => void;
  end: () => void;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = (req.query?.token || 'sui').toLowerCase();

  try {
    // 1. Fetch live price and confidence from DefiLlama (public-apis)
    const llamaResp = await fetch(`https://coins.llama.fi/prices/current/coingecko:${token}`, {
      headers: { 'Accept': 'application/json' },
    });
    const llamaData = await llamaResp.json().catch(() => ({}));
    const coinInfo = llamaData.coins?.[`coingecko:${token}`];

    // 2. Fetch market stats and ranking from Coinpaprika (public-apis)
    let paprikaData: any = null;
    try {
      const paprikaResp = await fetch(`https://api.coinpaprika.com/v1/tickers/${token}-${token}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (paprikaResp.ok) {
        paprikaData = await paprikaResp.json();
      }
    } catch {
      // Coinpaprika ticker is best-effort
    }

    return res.status(200).json({
      source: 'public-apis (DefiLlama & Coinpaprika)',
      token: token.toUpperCase(),
      priceUsd: coinInfo?.price ?? paprikaData?.quotes?.USD?.price ?? null,
      symbol: coinInfo?.symbol ?? paprikaData?.symbol ?? token.toUpperCase(),
      rank: paprikaData?.rank ?? null,
      change24h: paprikaData?.quotes?.USD?.percent_change_24h ?? null,
      confidence: coinInfo?.confidence ?? 0.99,
      timestamp: new Date().toISOString(),
      network: token === 'sui' ? 'Sui Testnet / Mainnet' : 'Multi-chain',
      safetyNote: 'Always verify contract addresses and avoid suspicious high-yield approvals.'
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to fetch market data from public APIs',
      details: err?.message || String(err)
    });
  }
}
