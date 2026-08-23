import { UserChecklist } from '../../memory/schema.js';

export const SAFE_SWAP_GUIDE: Omit<UserChecklist, 'id'> = {
  title: 'Safe Token Swap & DEX Approval',
  description: 'Verified pre-flight checklist for swapping tokens on decentralized exchanges (Cetus, Turbos, Uniswap).',
  chain: 'Multi-Chain',
  steps: [
    {
      stepNumber: 1,
      title: 'Verify Official DEX URL',
      action: 'Check that the URL is exact (e.g. app.cetus.zone, uniswap.org). Bookmark it for future use.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 2,
      title: 'Verify Token Contract Address',
      action: 'Always verify the token contract address on a trusted explorer (Suiscan / Etherscan) rather than searching by ticker symbol alone.',
      isRisky: true,
      cautionNote: 'Scammers frequently create fake tokens with identical symbols (e.g. USDT, SUI).',
      completed: false
    },
    {
      stepNumber: 3,
      title: 'Set Reasonable Slippage Tolerance',
      action: 'Set slippage between 0.5% and 1.0%. Avoid setting unlimited or high slippage (>5%) which enables MEV sandwich attacks.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 4,
      title: 'Reserve Native Gas Tokens',
      action: 'Never swap 100% of your native balance (SUI/ETH). Always retain at least 0.5 to 1.0 SUI for gas fees.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 5,
      title: 'Simulate & Review Wallet Pop-up',
      action: 'Examine the transaction summary in your wallet before clicking Approve. Ensure the balance changes match expectations.',
      isRisky: true,
      cautionNote: 'Review the exact token outflow and gas fees before signing.',
      completed: false
    }
  ]
};
