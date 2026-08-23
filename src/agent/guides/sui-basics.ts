import { UserChecklist } from '../../memory/schema.js';

export const WALRUS_SUI_ONBOARDING_GUIDE: Omit<UserChecklist, 'id'> = {
  title: 'Walrus Protocol & Sui Decentralized Storage',
  description: 'Learn how Walrus stores your data and memory blobs directly on the decentralized web.',
  chain: 'Walrus / Sui',
  steps: [
    {
      stepNumber: 1,
      title: 'Understand Walrus Blobs',
      action: 'Walrus breaks files and data into erasure-coded slivers distributed across global storage nodes for maximum resilience.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 2,
      title: 'Decentralized Memory Persistence',
      action: 'Gaid3 uses Walrus to store your learning progress, safety preferences, and checklists so your memory belongs to you, not a centralized server.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 3,
      title: 'Sui Epochs & Storage Renewals',
      action: 'Blobs on Walrus are certified for a set number of storage epochs using WAL tokens on the Sui network.',
      isRisky: false,
      completed: false
    },
    {
      stepNumber: 4,
      title: 'Decentralized Verification',
      action: 'Anyone with a Walrus aggregator or your Blob ID can verify data integrity without relying on a centralized database.',
      isRisky: false,
      completed: false
    }
  ]
};
