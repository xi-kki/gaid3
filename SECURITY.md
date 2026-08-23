# Gaid3 Security Policy & Architecture 🛡️

At **Gaid3**, security and user safety are not afterthoughts — they are the foundational reason the project exists. Web3 onboarding is fraught with irreversible risks; our architecture enforces defense-in-depth to protect users at every layer.

---

## 🔒 Core Security Principles

### 1. Zero Private Key & Seed Phrase Ingestion
- **Strict Prohibition**: Gaid3 will **NEVER** request, accept, or store private keys, seed phrases (12/24 words), or keystore JSON files.
- **Active Scanning**: The `SafetyGuardian` scanner evaluates all user prompts and transaction simulations before processing. If private keys or mnemonic phrases are detected, the agent halts immediately and issues a critical alert.

### 2. Sovereign Decentralized Memory (Walrus Protocol)
- **User Ownership**: User preferences, checklists, and risk profiles are encoded and stored as decentralized blobs on the Walrus Protocol.
- **No Centralized Data Traps**: Memory state is certified on the Sui network, ensuring users retain sovereign control over their historical onboarding data.

### 3. Pre-Flight Transaction & Approval Verification
- **Allowance Auditing**: Flags infinite/unlimited `approve` or `setApprovalForAll` requests, warning users to grant only the exact amount needed for individual swaps.
- **Phishing & Look-alike Domain Detection**: Flags unverified dApps, suspicious TLDs, and malicious airdrop claim links.
- **Irreversibility Warning**: Pauses the user on irreversible steps (e.g. cross-chain bridging, native transfers) and provides verification checklists.

---

## 📊 Threat Model & Mitigation Matrix

| Threat | Risk Level | Gaid3 Mitigation Strategy |
| :--- | :---: | :--- |
| **Accidental Seed Phrase Leakage** | 🔴 Critical | Regex pattern matching + instant stop hook; physical backup enforcement. |
| **Unlimited Token Approvals** | 🟠 High | Pre-flight analyzer checks allowance parameters and advises single-transaction limits. |
| **Phishing / Lookalike DEXes** | 🟠 High | Curated whitelist of verified DEXes (Cetus, Turbos, Uniswap) & exact domain matching. |
| **Gas Traps (Zero Balance)** | 🟡 Medium | Checks remaining native gas reserves (SUI/ETH) to ensure users retain gas for future txs. |
| **Secret Exposure in Repositories** | 🔴 Critical | Automated `.gitignore` shielding (`.env*`, `*.key`, `*.pem`) + remote config sanitization. |

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within Gaid3:
1. Please do not open a public issue.
2. Email security inquiries or disclosures to `security@gaid3.xyz` or open a private advisory on GitHub.
3. We will respond within 24 hours to investigate and release an advisory/patch.
