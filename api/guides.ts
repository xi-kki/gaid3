// Vercel types inlined
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

const SUI_WALLET_SETUP_GUIDE = {
  id: 'sui-wallet-setup',
  title: 'Sui Wallet Safe Setup',
  description: '5 verified steps to create your first Sui wallet safely.',
  steps: [
    'Download only from verified Chrome Web Store / sui.io',
    'Set a strong local app password',
    'Write 12 recovery words on physical paper (NEVER screenshot)',
    'Store physical backup in safe water/fireproof place',
    'Verify address on Sui Explorer before receiving funds',
  ],
  category: 'wallet',
};

const SAFE_SWAP_GUIDE = {
  id: 'safe-swap',
  title: 'Safe Swap on Cetus/Turbos',
  description: 'Step-by-step guide to swapping tokens safely on Sui DEXs.',
  steps: [
    'Connect wallet (zkLogin or Slush)',
    'Check slippage tolerance (0.5-1% for stable, 2-5% for volatile)',
    'Verify token addresses on Coingecko/Sui Explorer',
    'Approve exact amount only (never unlimited)',
    'Confirm TX in wallet, verify on Sui Explorer',
  ],
  category: 'defi',
};

const WALRUS_SUI_ONBOARDING_GUIDE = {
  id: 'walrus-sui-onboarding',
  title: 'Walrus Protocol + Sui Basics',
  description: 'How decentralized storage works on Sui with Walrus.',
  steps: [
    'Walrus stores blobs across Sui validators (not centralized servers)',
    'Your data = blobId + epochs (storage time)',
    'Pay with SUI for storage epochs (cheap, ~0.001 SUI/epoch)',
    'Retrieve via aggregator.walrus-testnet.walrus.space/v1/<blobId>',
    'Gaid3 auto-syncs your memory to Walrus for sovereign backup',
  ],
  category: 'storage',
};

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.json({
    guides: [SUI_WALLET_SETUP_GUIDE, SAFE_SWAP_GUIDE, WALRUS_SUI_ONBOARDING_GUIDE],
  });
}