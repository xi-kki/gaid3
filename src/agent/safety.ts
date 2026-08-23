export interface SafetyCheckResult {
  riskScore: number; // 0 (completely safe) to 100 (critical danger)
  isIrreversible: boolean;
  warnings: string[];
  recommendations: string[];
  safeNextStep: string;
}

export class SafetyGuardian {
  /**
   * Scans text or transaction input for dangerous patterns
   */
  static evaluateAction(actionDescription: string): SafetyCheckResult {
    const text = actionDescription.toLowerCase();
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 10;
    let isIrreversible = false;

    // 1. Seed Phrase / Private Key Leakage Detection
    const seedWords = text.match(/\b([a-z]{3,12}\s+){11,23}[a-z]{3,12}\b/i);
    const privateKeyPattern = /0x[a-fA-F0-9]{64}|[1-9A-HJ-NP-Za-km-z]{44,88}/;
    if (
      seedWords ||
      privateKeyPattern.test(actionDescription) ||
      text.includes('seed phrase') ||
      text.includes('private key') ||
      text.includes('secret recovery phrase')
    ) {
      riskScore = 100;
      isIrreversible = true;
      warnings.push('CRITICAL RISK: Potential Private Key or Seed Phrase detected.');
      recommendations.push('NEVER share your 12/24-word seed phrase or private key with anyone or any AI agent.');
      recommendations.push('Legitimate dApps and support staff will NEVER ask for your secret phrase.');
      return {
        riskScore,
        isIrreversible,
        warnings,
        recommendations,
        safeNextStep: 'Immediately stop and keep your secret phrase stored securely offline on physical paper.'
      };
    }

    // 2. Unlimited Token Approvals
    if (text.includes('approve') || text.includes('unlimited') || text.includes('infinite') || text.includes('setapprovalforall')) {
      riskScore = Math.max(riskScore, 75);
      warnings.push('High Approval Warning: Unlimited token approvals allow smart contracts to spend all of your tokens.');
      recommendations.push('Only approve the exact amount needed for this single transaction.');
      recommendations.push('Regularly revoke old contract allowances on tools like Revoke.cash or Sui explorer.');
    }

    // 3. Phishing / Unverified links
    if (text.includes('http://') || (text.includes('.xyz') && !text.includes('walrus.xyz')) || text.includes('claim-airdrop') || text.includes('free-mint')) {
      riskScore = Math.max(riskScore, 80);
      warnings.push('Suspicious URL Pattern: Many phishing dApps use fake look-alike URLs to drain wallets.');
      recommendations.push('Double check the exact spelling of the domain and use official bookmarked links.');
    }

    // 4. Cross-chain Bridging & Sending Funds
    if (text.includes('bridge') || text.includes('transfer') || text.includes('send')) {
      isIrreversible = true;
      riskScore = Math.max(riskScore, 50);
      warnings.push('Irreversible Action: Blockchain transactions cannot be reversed or refunded once confirmed.');
      recommendations.push('Verify the destination network (e.g. Sui vs Ethereum) and send a tiny test transaction first.');
    }

    // 5. Gas / SUI fees
    if (text.includes('all-in') || text.includes('send max') || text.includes('swap all')) {
      riskScore = Math.max(riskScore, 40);
      warnings.push('Gas Reserve Warning: Leaving 0 native token (SUI/ETH) will trap your wallet without gas for future transactions.');
      recommendations.push('Always leave at least 0.5 to 1 SUI (or $5-10 worth of gas) in your wallet.');
    }

    const safeNextStep =
      riskScore > 60
        ? 'Pause here. Verify contract addresses and confirm you are on the verified official website before approving.'
        : 'Review the details on your wallet screen carefully, check the gas fee, and proceed when comfortable.';

    return {
      riskScore,
      isIrreversible,
      warnings,
      recommendations,
      safeNextStep
    };
  }
}
