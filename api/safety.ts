// Vercel types inlined
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; query?: Record<string, string>; socket: { remoteAddress?: string } };
type VercelResponse = { status: (n: number) => VercelResponse; json: (o: unknown) => VercelResponse; setHeader: (k: string, v: string) => void; end: () => void; };

export interface SafetyAssessment {
  riskScore: number; // 0 to 100
  isCritical: boolean;
  isIrreversible: boolean;
  category: 'safe' | 'seed_leak' | 'unlimited_approval' | 'phishing' | 'irreversible_transfer' | 'gas_drain';
  warnings: string[];
  recommendation: string;
  safeNextStep: string;
}

export function scanSecurity(actionText: string): SafetyAssessment {
  const text = actionText.toLowerCase();
  const warnings: string[] = [];

  // 1. Seed phrase detection: 11+ space-separated words, or explicit seed/recovery phrase mentions
  const seedPhraseMatch = text.match(/\b([a-z]{3,12}\s+){11,23}[a-z]{3,12}\b/i);
  const privateKeyMatch = text.match(/0x[a-f0-9]{64}\b|[1-9a-km-za-hj-np-z]{44,88}\b/i);
  const explicitSeedMention =
    text.includes('seed phrase') ||
    text.includes('secret recovery phrase') ||
    text.includes('private key') ||
    text.includes('mnemonic phrase') ||
    text.includes('12 words') ||
    text.includes('24 words');

  if (seedPhraseMatch || privateKeyMatch || explicitSeedMention) {
    return {
      riskScore: 100,
      isCritical: true,
      isIrreversible: true,
      category: 'seed_leak',
      warnings: [
        'CRITICAL SECURITY ALERT: Potential Secret Recovery Phrase or Private Key detected!',
        'No legitimate Web3 support team, dApp, or AI agent will EVER ask for your seed phrase.',
      ],
      recommendation: 'Stop immediately. Never paste secret recovery words or private keys into any website or chat.',
      safeNextStep: 'Write your 12 recovery words on physical paper and store them offline in a private, waterproof place.',
    };
  }

  // 2. Unlimited token approvals / setApprovalForAll
  if (
    text.includes('unlimited') ||
    text.includes('infinite approval') ||
    text.includes('setapprovalforall') ||
    (text.includes('approve') && (text.includes('all') || text.includes('max')))
  ) {
    return {
      riskScore: 85,
      isCritical: false,
      isIrreversible: true,
      category: 'unlimited_approval',
      warnings: [
        'High Risk Allowance: Unlimited spending approvals grant smart contracts permission to withdraw all of that token from your wallet at any future time.',
      ],
      recommendation: 'Adjust the approval amount to only cover the exact token quantity needed for this single transaction.',
      safeNextStep: 'In your wallet popup, click "Edit Allowance" and enter the exact transaction amount.',
    };
  }

  // 3. Phishing and lookalike domain patterns
  if (
    text.includes('claim-airdrop') ||
    text.includes('free-mint') ||
    text.includes('bonus-reward') ||
    (text.includes('http://') && !text.includes('localhost')) ||
    (text.includes('.xyz') && !text.includes('walrus.xyz'))
  ) {
    return {
      riskScore: 80,
      isCritical: false,
      isIrreversible: false,
      category: 'phishing',
      warnings: [
        'Phishing Domain Risk: Malicious drainer sites frequently impersonate legitimate protocols using urgency and free airdrop promises.',
      ],
      recommendation: 'Verify the protocol through its official GitHub or verified Twitter/X handle before connecting your wallet.',
      safeNextStep: 'Navigate exclusively from bookmarked official portals (e.g., sui.io, walrus.xyz).',
    };
  }

  // 4. Irreversible transfers and cross-chain bridging
  if (text.includes('bridge') || text.includes('transfer') || text.includes('send to')) {
    return {
      riskScore: 45,
      isCritical: false,
      isIrreversible: true,
      category: 'irreversible_transfer',
      warnings: [
        'Irreversible Action: Blockchain transactions cannot be reversed or refunded by anyone once mined.',
      ],
      recommendation: 'Confirm the destination address and network chain (Sui Testnet vs Mainnet) before confirming.',
      safeNextStep: 'Send a minimal test transfer ($0.50 equivalent) before transferring any significant balance.',
    };
  }

  // 5. Gas exhaustion / Emptying native token
  if (text.includes('all-in') || text.includes('swap all sui') || text.includes('send max sui')) {
    return {
      riskScore: 40,
      isCritical: false,
      isIrreversible: false,
      category: 'gas_drain',
      warnings: [
        'Gas Lockout Warning: Leaving 0 SUI will leave your wallet unable to pay gas fees for future transfers or approval revocations.',
      ],
      recommendation: 'Always maintain a minimum buffer of at least 0.5 to 1 SUI for gas fees.',
      safeNextStep: 'Reduce the transaction amount slightly to leave gas tokens intact.',
    };
  }

  // Standard safe transaction
  return {
    riskScore: 10,
    isCritical: false,
    isIrreversible: false,
    category: 'safe',
    warnings: ['Standard Web3 exploration.'],
    recommendation: 'Review the gas fee, recipient address, and contract verification status on your wallet screen.',
    safeNextStep: 'Proceed whenever you feel confident and comfortable.',
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { actionText } = (req.body || {}) as { actionText?: string };
  if (!actionText) return res.status(400).json({ error: 'actionText is required' });

  const result = scanSecurity(actionText);
  return res.json(result);
}