import { MemWalClient } from '../memory/memwal-client.js';
import { SafetyGuardian, SafetyCheckResult } from './safety.js';
import { formatContextPrompt, GAID3_SYSTEM_PROMPT } from './prompt.js';
import { GoogleGenAI } from '@google/genai';

export interface Gaid3Response {
  message: string;
  recalledMemory: {
    summary: string;
    factsCount: number;
    walrusBlobId?: string;
  };
  safetyAssessment?: SafetyCheckResult;
  suggestedAction?: string;
  newFactsSaved?: string[];
}

export class Gaid3Agent {
  private memory: MemWalClient;
  private aiClient?: GoogleGenAI;

  constructor(memoryClient?: MemWalClient) {
    this.memory = memoryClient || new MemWalClient();
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        this.aiClient = new GoogleGenAI({ apiKey });
      } catch (err) {
        // Fallback to local rule-based response generator
      }
    }
  }

  /**
   * Process a user turn with proactive memory recall, safety review, and Walrus persistence
   */
  async chat(userMessage: string): Promise<Gaid3Response> {
    const trimmed = userMessage.trim();

    // 1. Proactive Memory Recall
    const recalled = await this.memory.memwal_recall(trimmed || 'user status goals experience');

    // 2. Safety Guardian Evaluation
    const safetyAssessment = SafetyGuardian.evaluateAction(trimmed);

    // 3. Extract & Remember Durable Facts
    const newFactsSaved: string[] = [];
    if (this.isDurableFact(trimmed)) {
      const fact = await this.memory.memwal_remember(trimmed);
      newFactsSaved.push(fact.statement);
    }

    // 4. Generate Response (via Gemini API or deterministic empathetic engine)
    let replyText = '';
    if (this.aiClient) {
      try {
        const fullPrompt = formatContextPrompt(trimmed, recalled);
        const response = await this.aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt
        });
        replyText = response.text || '';
      } catch (err) {
        replyText = this.generateEmpatheticFallback(trimmed, recalled, safetyAssessment);
      }
    } else {
      replyText = this.generateEmpatheticFallback(trimmed, recalled, safetyAssessment);
    }

    // 5. Package and return full agent response
    const profile = this.memory.getProfile();
    return {
      message: replyText,
      recalledMemory: {
        summary: recalled.summary,
        factsCount: profile.rawDurableFacts.length,
        walrusBlobId: profile.walrusBlobId
      },
      safetyAssessment,
      newFactsSaved: newFactsSaved.length > 0 ? newFactsSaved : undefined
    };
  }

  /**
   * Returns memory client instance
   */
  getMemory(): MemWalClient {
    return this.memory;
  }

  private isDurableFact(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('i use') ||
      lower.includes('i prefer') ||
      lower.includes('i have') ||
      lower.includes('my wallet') ||
      lower.includes('my favorite') ||
      lower.includes('i lost') ||
      lower.includes('i got scammed') ||
      lower.includes('i am new') ||
      lower.includes('i am beginner') ||
      lower.includes('my goal is') ||
      lower.includes('i want to learn')
    );
  }

  private generateEmpatheticFallback(
    userMessage: string,
    recalled: any,
    safety: SafetyCheckResult
  ): string {
    const text = userMessage.toLowerCase();

    // Critical security alert first
    if (safety.riskScore >= 75) {
      return `⚠️ **Safety First Pause**\n\n${safety.warnings.join('\n')}\n\n💡 **Recommendation**: ${safety.recommendations.join(
        ' '
      )}\n\n👉 **Next Safe Step**: ${safety.safeNextStep}`;
    }

    // First session / greeting
    if (text.includes('hello') || text.includes('hi') || text.includes('hey') || recalled.facts.length === 0) {
      return `Hello! I’m **Gaid3** — your calm, patient Web3 guide powered by Walrus decentralized memory.\n\nMy mission is to make exploring crypto simple, safe, and stress-free. Every step is tailored to you, and we'll go at your pace.\n\nTo help me understand where to begin:\n1. **What is your experience level with Web3?** *(e.g. brand new / used a wallet / intermediate)*\n2. **What would you like to achieve first?** *(e.g. set up Sui wallet, try Walrus storage, make a swap)*\n3. **Do you have a preferred blockchain or wallet?**`;
    }

    // Wallet setup inquiries
    if (text.includes('wallet') || text.includes('setup') || text.includes('install')) {
      return `Let’s set up your wallet safely together:\n\n1. **Download the Official Extension**: Always install from the official site (e.g. sui.io for Sui Wallet or metamask.io for Ethereum).\n2. **Set an App Password**: Choose a strong password for unlocking your browser.\n3. **Backup Your 12-Word Secret Phrase**: Write this down with pen on paper. Never screenshot or paste it online.\n\nLet me know when you've downloaded the extension, and we'll take the next step together!`;
    }

    // Sui & Walrus inquiries
    if (text.includes('sui') || text.includes('walrus')) {
      return `Sui and Walrus Protocol work together to bring high speed and decentralized storage to Web3:\n\n• **Sui**: Fast layer-1 blockchain with object-centric architecture and low fees.\n• **Walrus**: Decentralized blob storage protocol where your data, files, and AI memories are stored permanently across distributed nodes.\n\nWould you like me to walk you through storing your first decentralized memory snapshot or creating a Sui wallet?`;
    }

    // Default supportive response
    return `I hear you! We'll take this one step at a time.\n\n• **Current Goal**: ${
      recalled.profile.goals.length > 0 ? recalled.profile.goals.join(', ') : 'Exploring Web3 safely'
    }\n• **Memory Status**: Your preferences and progress are safely tracked in Walrus Memory.\n\nWhat specific task or question would you like us to look at right now?`;
  }
}
