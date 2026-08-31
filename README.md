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

Like NotebookLM, Gaid3 now turns **any source into study tools**. Powered by Groq `qwen/qwen3.6-27b` (chat) and `groq/compound-mini` (structured generation):

1. **Add Source:** Paste URL → `POST /api/ingest` extracts clean text. YouTube links automatically fetch transcripts via `youtube-transcript`.
2. **Mind Map:** `POST /api/generate/mindmap` → `{nodes, edges}` (12–22 nodes)
3. **Flashcards:** `POST /api/generate/flashcards` → 12 Q/A cards with hints/tags → flip, next/prev, copy JSON → Anki-ready
4. **Quiz:** `POST /api/generate/from-memory` with `"type":"quiz"` → MCQs with explanations
5. **Summary:** `POST /api/generate/from-memory` with `"type":"summary"` → 200-word overview + key points + takeaways
6. **Ask / Search:** `POST /api/generate/from-memory` with `"type":"ask"` or `"type":"search"` → Q&A with citations from Walrus memory
7. **Simplify:** `POST /api/generate/from-memory` with `"type":"simplify"` → explains Web3 concepts (whitepapers, docs, YouTube transcripts) in simple terms for beginners
8. **Podcast:** `POST /api/generate/from-memory` with `"type":"podcast"` → 2-speaker script with Walrus memory references
9. **Walrus Certify:** `POST /api/memory/sync` stores snapshot to Walrus Testnet (mock fallback offline)

### 🔄 Open Notebook Integration

**Local dev (no Docker needed):** Run the included mock — it implements the real open-notebook API backed by Groq:

```bash
npm run mock:notebook   # :5055, needs GROQ_API_KEY + OPEN_NOTEBOOK_PASSWORD=test
npm run dev:notebook    # mock + api + web together
# .env.local already has OPEN_NOTEBOOK_URL=http://localhost:5055
curl -s -X POST http://localhost:3001/api/generate/from-memory -H "Content-Type: application/json" -d '{"type":"simplify","history":[{"role":"user","content":"Explain Sui"}],"question":"Explain zkLogin simply"}' | jq .source
# → "open-notebook"  (via mock, Groq-backed)
```

**Production self-hosted (Docker):** Requires Docker Desktop:

```bash
docker compose -f docker-compose.notebook.yml up -d
# UI: http://localhost:8502  API: http://localhost:5055
# Configure a model in the UI: Settings → Models → Add Groq qwen/qwen3.6-27b
# Then set OPEN_NOTEBOOK_URL + OPEN_NOTEBOOK_PASSWORD in Vercel env vars
```

When `OPEN_NOTEBOOK_URL` is set, Gaid3 routes through open-notebook (real or mock):
 `ask`/`search`/`summary`/`simplify` → source chat (`POST /api/sources/{id}/chat/sessions/{sid}/messages`)
 `mindmap`/`flashcards`/`quiz`/`podcast` → transformations (`POST /api/transformations/execute`)

Fallback: when open-notebook is unreachable or returns an error, Gaid3 automatically uses Groq (`groq/compound-mini` / `qwen/qwen3.6-27b`) or offline fixtures — so the app works with or without open-notebook.

**Endpoints (Zod-validated, rate-limited 20/min):**

```bash
curl -X POST https://gaid3.vercel.app/api/chat -H "Content-Type: application/json" \

curl -X POST https://gaid3.vercel.app/api/ingest -d '{"url":"https://docs.sui.io"}'
curl -X POST https://gaid3.vercel.app/api/ingest -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}'
curl -X POST https://gaid3.vercel.app/api/generate/mindmap -d '{"sourceText":"...","title":"Sui 101"}'
curl -X POST https://gaid3.vercel.app/api/generate/flashcards -d '{"sourceText":"...","count":12}'
curl -X POST https://gaid3.vercel.app/api/generate/from-memory -d '{"type":"simplify","history":[...],"question":"Explain zkLogin"}'
```

**Env vars** (Vercel Dashboard → Settings → Environment Variables):

 `GROQ_API_KEY` — Yes — Groq API key (qwen/qwen3.6-27b + groq/compound-mini)
 `VITE_GOOGLE_CLIENT_ID` — Yes — Google OAuth 2.0 Client ID (zkLogin)
 `ENOKI_API_KEY` — Optional — Enoki private key for zkLogin salt
 `OPEN_NOTEBOOK_URL` — Optional — open-notebook API URL (mock :5055 or Docker :5055)
 `OPEN_NOTEBOOK_PASSWORD` — Optional — Bearer token for open-notebook
 `YOUTUBE_API_KEY` — Optional — for private/unlisted YouTube transcripts
 `XAI_API_KEY` / `GROK_API_KEY` / `GEMINI_API_KEY` — Optional — Fallback AIs
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
