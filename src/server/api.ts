import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Gaid3Agent } from '../agent/core.js';
import { SafetyGuardian } from '../agent/safety.js';
import { SUI_WALLET_SETUP_GUIDE } from '../agent/guides/wallet-setup.js';
import { SAFE_SWAP_GUIDE } from '../agent/guides/safe-swap.js';
import { WALRUS_SUI_ONBOARDING_GUIDE } from '../agent/guides/sui-basics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const agent = new Gaid3Agent();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    agent: 'Gaid3',
    version: '1.0.0',
    memoryProvider: 'Walrus Protocol (MemWal)',
    timestamp: new Date().toISOString()
  });
});

// Chat / Interaction endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const response = await agent.chat(message);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal agent error' });
  }
});

// Walrus Memory profile inspection
app.get('/api/memory', async (req, res) => {
  const profile = agent.getMemory().getProfile();
  res.json(profile);
});

// Trigger Walrus Memory Sync
app.post('/api/memory/sync', async (req, res) => {
  try {
    const result = await agent.getMemory().syncToWalrus();
    res.json({
      success: true,
      walrusBlobId: result.blobId,
      epoch: result.epoch,
      message: 'Memory snapshot successfully certified on Walrus decentralized storage.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Pre-flight Safety Evaluation
app.post('/api/safety', (req, res) => {
  const { actionText } = req.body;
  if (!actionText) {
    return res.status(400).json({ error: 'actionText is required.' });
  }
  const result = SafetyGuardian.evaluateAction(actionText);
  res.json(result);
});

// Curated Onboarding Guides
app.get('/api/guides', (req, res) => {
  res.json({
    guides: [SUI_WALLET_SETUP_GUIDE, SAFE_SWAP_GUIDE, WALRUS_SUI_ONBOARDING_GUIDE]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Gaid3 API Server running at http://localhost:${PORT}`);
});
