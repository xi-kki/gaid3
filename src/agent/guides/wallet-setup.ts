import { UserChecklist } from '../../memory/schema.js';

export const SUI_WALLET_SETUP_GUIDE: Omit<UserChecklist, 'id'> = {
  title: 'Safe Sui Wallet Setup',
  description: 'Step-by-step guide to installing, securing, and backing up your first Sui Wallet safely.',
  chain: 'Sui',
  steps: [
    {
      stepNumber: 1,
      title: 'Download Official Extension',
      action: 'Install Sui Wallet exclusively from the official Chrome Web Store or official website (sui.io). Avoid search ads.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 2,
      title: 'Create Strong App Password',
      action: 'Set a strong password for unlocking your browser extension on your current device.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 3,
      title: 'Backup 12-Word Recovery Phrase',
      action: 'Write down your 12 recovery words on physical paper with pen. NEVER copy-paste to clipboard or cloud storage.',
      isRisky: true,
      cautionNote: 'If you lose this phrase or share it with anyone, your funds are permanently lost.',
      completed: false
    },
    {
      stepNumber: 4,
      title: 'Confirm Recovery Phrase',
      action: 'Confirm the words in the exact sequence requested by the wallet.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 5,
      title: 'Store Backup in Safe Location',
      action: 'Place the paper backup in a secure, water/fire-resistant location. Do not photograph it.',
      isRisky: true,
      cautionNote: 'Never screenshot or store digital copies on Google Drive / iCloud.',
      completed: false
    }
  ]
};
