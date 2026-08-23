# Gaid3 Project TODO & Roadmap 🧭

> **Gaid3**: A calm, patient, and highly practical Web3 Onboarding AI Agent powered by Walrus Memory.

---

## 🚀 Phase 1: Core Scaffolding & Configuration
- [x] Create project directory structure (`C:\Users\HP\gaid3`)
- [x] Configure TypeScript compiler settings (`tsconfig.json`)
- [x] Set up root `package.json` with scripts for CLI, Web UI, and Server
- [x] Create environment variables template (`.env.example`)
- [x] Set up Git ignore file (`.gitignore`)
- [x] Add Open Source license (`LICENSE` - Apache 2.0)
- [x] Create Agent Rules for IDE / Antigravity (`AGENTS.md`, `GEMINI.md`, `.agents/rules/gaid3.md`)

## 🎨 Phase 2: High-Fidelity "Beyond Hero" Landing Page
- [ ] Set up Vite + React + TypeScript + Tailwind CSS in `web/`
- [ ] Load exact typography in `web/index.html` (Bamboly Demo, Inter, Poppins)
- [ ] Implement `<Hero />` component with exact 120vh container, sticky z5 text overlay, stacked 4-layer "BEYOND" heading, Poppins side columns, and scroll-driven inward animation
- [ ] Implement centered Character z10 layer (115% height, bottom-anchored, over title)
- [ ] Implement `<Marquee />` white band component with 18s infinite loop (`SPARK · RENDER · IGNITE · UNFOLD · GENESIS · EVOLVE · PURPOSE · BEYOND · `)
- [ ] Verify responsive layout across mobile (<768px) and desktop

## 🧠 Phase 3: Walrus Memory & Core Intelligence
- [x] Define Memory Data Schema (`src/memory/schema.ts`)
- [x] Build MemWal MCP Client Interface (`src/memory/memwal-client.ts`)
- [x] Build Walrus Protocol Decentralized Storage Connector (`src/memory/walrus-blob.ts`)
- [x] Implement Gaid3 Empathetic System Prompt & Principles (`src/agent/prompt.ts`)
- [x] Transaction Safety Pre-Flight Simulator (`src/agent/safety.ts`)
- [ ] Interactive Onboarding Guide Modules (`src/agent/guides/`)
- [ ] Implement Core Agent Engine (`src/agent/core.ts`)

## 💻 Phase 4: CLI & Server
- [ ] Interactive Terminal CLI (`src/cli/index.ts`)
- [ ] Backend API Bridge (`src/server/api.ts`)

## 🐙 Phase 5: GitHub Deployment & Hackathon Packaging
- [ ] Initialize Git repository (`git init`)
- [ ] Configure GitHub Remote & Authentication:
  - Option A: GitHub Personal Access Token (PAT) with `repo` scope
  - Option B: GitHub CLI `gh auth login`
  - Option C: SSH key (`git@github.com:...`)
- [ ] Commit all code and push to GitHub repository
- [ ] Verify complete project build (`npm run build`, `npm run web:build`)
