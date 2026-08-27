<div align="center">

# Gaid3 — Web3 Onboarding AI Agent 🧭
### *Calm, Patient, and Sovereign Web3 Onboarding Powered by Walrus Memory*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/xi-kki/gaid3/actions)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Walrus Protocol](https://img.shields.io/badge/Walrus-Testnet%20Certified-EC612C.svg)](https://walrus.xyz)
[![Sui Network](https://img.shields.io/badge/Sui-Move%20Ecosystem-4da2ff.svg)](https://sui.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6.svg)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy%20Ready-black.svg)](https://vercel.com)

<br/>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fxi-kki%2Fgaid3)

<br/>

<img src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260801_104316_80b428ea-dc99-4399-afb3-8ccb7b34b2d0.png&w=1280&q=85" alt="Gaid3 Banner" width="600" style="border-radius: 12px; margin-top: 16px;" />

<p align="center">
  <b>Gaid3</b> eliminates crypto anxiety by pairing an empathetic AI onboarding companion with decentralized memory on <b>Walrus Protocol</b>.
</p>

</div>

---

## 🌟 Executive Summary & Problem Statement

Entering Web3 is notoriously terrifying for beginners. Confusing terminology, high-pressure irreversible transactions, malicious token approvals, and complex wallet setups cause catastrophic drops in onboarding conversion.

**Gaid3** solves this with a **stress-free, empathetic pair guide**:
- **Continuous Sovereign Memory**: Remembers your experience level, preferred chains, completed checklists, and past scary moments permanently across conversations using **Walrus Protocol** decentralized blobs.
- **Pre-Flight Safety Guardian**: Evaluates text, smart contract interactions, and approval allowances before you sign in your wallet.
- **Progressive Step-by-Step Guidance**: Breaks complex tasks (Sui Wallet creation, DEX swaps on Cetus/Turbos, bridging) into safe, bite-sized steps with mandatory pause checks on irreversible actions.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([Web3 User / Explorer]) <--> WebApp[Frontend: Beyond Hero Landing Page & Gaid3 Suite]
    User <--> CLI[Terminal CLI: npm run cli]

    subgraph Gaid3 Intelligence Core
        WebApp <--> APIBridge[Express REST API /api/chat]
        CLI <--> AgentEngine[Gaid3 Agent Runtime]
        APIBridge <--> AgentEngine
        
        AgentEngine <--> SafetyGuardian[🛡️ Safety Guardian Scanner]
        AgentEngine <--> PromptBuilder[💬 Empathetic Context Builder]
        AgentEngine <--> GuideEngine[📋 Verified Flow Checklists]
    end

    subgraph Decentralized Memory Layer
        AgentEngine <--> MemWal[🧠 MemWal Semantic Recall]
        MemWal <--> WalrusBlob[📦 Walrus Blob Storage Client]
        WalrusBlob <--> WalrusNet[(🌐 Walrus Protocol / Sui Testnet)]
    end
```

---

## ⚡ Key Features

| Feature | Description |
| :--- | :--- |
| **🧠 Walrus Decentralized Memory** | Proactive semantic recall powered by MemWal. Stores user experience, risk tolerance, and checklists directly on Walrus decentralized storage. |
| **🛡️ Pre-Flight Safety Sandbox** | Scans for seed phrase leakage, unlimited contract spending approvals, phishing URLs, and gas exhaustion before signing. |
| **🎨 "Beyond Hero" Landing Page** | High-performance React + Vite + Tailwind frontend featuring 4-layer stacked `GAID3` typography, scroll-driven word animations, and infinite white marquee. |
| **📋 Verified Step-by-Step Flows** | Interactive onboarding guides for Sui Wallet setup, seed phrase paper backup, and Cetus/Turbos safe swapping. |
| **💻 Interactive Terminal CLI** | Full-featured CLI (`npm run cli`) with `/memory`, `/safety`, and `/sync` commands for developers. |
| **🔐 Server-Side AI Proxy** | Groq/Grok keys stay in Vercel env (never `VITE_`), rate-limited `/api/chat`, Zod-validated, CORS-locked. No more exposed `gsk_...` in bundle. |
| **🆔 zkLogin (Sui)** | **NEW:** Google OAuth → Sui address in 1 click, **no seed phrase**. Uses `@mysten/sui/zklogin` + Enoki salt. Upgrade to Slush later. |
| **🔒 Enterprise Security Posture** | Comprehensive `SECURITY.md`, zero-key leakage architecture, and automated GitHub Actions CI/CD pipeline. |

## 🆔 zkLogin — Zero-Fear Onboarding (New)

Gaid3 now uses **Sui zkLogin** for instant, seedless onboarding:

1. **User clicks** "Continue with Google" on landing page (Hero)
2. **Google OAuth** returns JWT with `nonce` bound to ephemeral keypair
3. **Enoki salt service** (optional) derives deterministic salt → Sui address = `jwtToAddress(jwt, salt)`
4. **Address persists** in `sessionStorage` → shows in Hero + attaches to Walrus Memory
5. **Upgrade path**: "Backup to Slush seed" guide when ready

**Env (Vercel → Settings → Environment Variables):**
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_ENOKI_API_KEY=enoki_... (optional, production)
```

**API:**
```
POST /api/auth/zklogin { action: "get-salt", token: "<id_token>" }
  → { salt: "0x...", source: "enoki|demo-fallback" }
```

**Docs:** See `web/src/hooks/useZkLogin.ts` + `web/src/components/ZkLoginButton.tsx` for full flow.

---

## 📚 NotebookLM Studio (New)

Like NotebookLM, Gaid3 now turns **any source into study tools**:

1. **Add Source:** Paste URL → `POST /api/ingest` extracts clean text (or paste directly)
2. **Mind Map:** `POST /api/generate/mindmap` → `{nodes, edges}` (Groq `json_object`, 12–22 nodes) → render with React Flow / Mermaid
3. **Flashcards:** `POST /api/generate/flashcards` → 12 Q/A cards with hints/tags → flip, next/prev, copy JSON → Anki-ready
4. **Walrus Certify:** `POST /api/memory/sync` stores snapshot to `publisher.walrus-testnet.walrus.space/v1/store` (mock fallback offline)

**API (all server-side, Zod-validated, rate-limited 20/min):**

```bash
curl -X POST https://gaid3.vercel.app/api/chat -H "Content-Type: application/json" \
  -d '{"message":"How do I safely setup a Sui wallet?","context":"...","history":[]}'

curl -X POST https://gaid3.vercel.app/api/ingest -d '{"url":"https://docs.sui.io"}'
curl -X POST https://gaid3.vercel.app/api/generate/mindmap -d '{"sourceText":"...","title":"Sui 101"}'
curl -X POST https://gaid3.vercel.app/api/generate/flashcards -d '{"sourceText":"...","count":12}'
```

Env: Set `GROQ_API_KEY` (no `VITE_` prefix) in **Vercel → Settings → Environment Variables** → Redeploy. See `.env.example`.

---

## 🏗️ System Architecture

### Option 1: One-Click Automatic Vercel Deployment
Click the button below to deploy your own instance of Gaid3 to Vercel instantly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fxi-kki%2Fgaid3)

*(The included [`vercel.json`](vercel.json) automatically configures the Vite frontend build and routing).*

---

### Option 2: Deploying via Vercel Dashboard (Connected to GitHub)
1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Select the **`xi-kki/gaid3`** repository.
4. Keep the default settings (Vercel automatically detects Vite and `vercel.json`).
5. Click **"Deploy"**!

---

### Option 3: Local Development Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/xi-kki/gaid3.git
cd gaid3

# 2. Install dependencies & compile
npm install
cd web && npm install && cd ..
npm run build

# 3. Launch interactive CLI
npm run cli

# 4. Launch the Web Landing Page & Gaid3 Suite
npm run web:dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🛡️ Security & Privacy Guarantees

- **No Key Custody**: Gaid3 never stores, requests, or transmits private keys or seed phrases.
- **Automated CI/CD**: Every push is verified with TypeScript strict compilation and automated dependency security scans.
- See full security details in [`SECURITY.md`](SECURITY.md).

---

## 📜 License
Distributed under the **Apache License 2.0**. See [`LICENSE`](LICENSE) for more information.
