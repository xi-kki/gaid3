# Gaid3 — Web3 Onboarding AI Agent 🧭

> **A calm, patient, and highly practical Web3 Onboarding AI Agent powered by Walrus Memory.**

![Gaid3 Hero Banner](https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260801_104316_80b428ea-dc99-4399-afb3-8ccb7b34b2d0.png&w=1280&q=85)

---

## 🌟 The Problem & The Solution

**The Problem**: Web3 is intimidating. New users are bombarded with confusing jargon, terrifying warnings about irreversible loss, complicated wallet setups, and treacherous phishing links. One mistake can result in lost funds.

**The Solution**: **Gaid3** is an empathetic, anxiety-reducing AI guide designed specifically to make Web3 simple and safe. Powered by **Walrus Protocol**, Gaid3 remembers each user's unique experience level, preferred chains, past mistakes, and personalized checklists permanently across sessions on the decentralized web.

---

## 🧠 Why Walrus Memory?

Centralized AI memory locks user data inside closed corporate servers. **Gaid3** uses **MemWal** and **Walrus Protocol** on Sui to store memory blobs directly on the decentralized web:

- **Sovereign**: The user owns their memory state.
- **Continuous**: Gaid3 never forgets past errors, risk tolerance, or completed steps across conversations.
- **Resilient**: Distributed across Walrus storage nodes with erasure coding.

---

## 🏗️ Architecture

```
                       ┌───────────────────────────────┐
                       │          User Input           │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────────┐
                       │     Safety Guardian Scan      │
                       │  (Key Leakage / Phishing /    │
                       │   High Approvals Detection)   │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
 ┌──────────────────────┐      ┌───────────────────────────────┐
 │    Walrus Protocol   │ <──> │      MemWal Memory Layer      │
 │ (Decentralized Blobs)│      │  (Semantic Recall & Storing)  │
 └──────────────────────┘      └──────────────┬────────────────┘
                                              │
                                              ▼
                               ┌───────────────────────────────┐
                               │       Gaid3 Core Engine       │
                               │  (Empathetic Response & Safe  │
                               │     Step-by-Step Guidance)    │
                               └──────────────┬────────────────┘
                                              │
                                              ▼
                               ┌───────────────────────────────┐
                               │  Web Dashboard / Terminal CLI │
                               └───────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### 1. Installation
```bash
git clone https://github.com/<YOUR_USERNAME>/gaid3.git
cd gaid3
npm install
cd web && npm install && cd ..
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Optional: Add your `GEMINI_API_KEY` for LLM responses, or run the local empathetic engine).*

### 3. Run Interactive Terminal CLI
```bash
npm run cli
```

### 4. Run "Beyond Hero" Landing Page & Web UI
```bash
cd web
npm run dev
```
Open `http://localhost:3000` to view the high-fidelity landing page!

---

## 🐙 Deploying to Your GitHub

To upload this repository to your GitHub account:

### Step 1: Create a new repository on GitHub
Create a new blank repository at [github.com/new](https://github.com/new) named `gaid3`.

### Step 2: Push via GitHub Personal Access Token (PAT)
1. Generate a Personal Access Token on GitHub at: `Settings > Developer Settings > Personal access tokens > Tokens (classic)` with `repo` scope.
2. In your terminal, run:
```bash
cd C:/Users/HP/gaid3
git init
git add .
git commit -m "feat: Gaid3 Web3 Onboarding AI Agent powered by Walrus Memory"
git branch -M main
git remote add origin https://<YOUR_GITHUB_TOKEN>@github.com/<YOUR_USERNAME>/gaid3.git
git push -u origin main
```

*(Alternatively, if you have GitHub CLI installed, you can run `gh repo create gaid3 --public --source=. --push`).*

---

## 📜 License
Apache License 2.0.
