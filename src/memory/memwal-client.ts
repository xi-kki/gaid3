import { Gaid3UserProfile, UserChecklist, UserMemoryFact, UserMistakeEntry } from './schema.js';
import { WalrusBlobService } from './walrus-blob.js';
import { nanoid } from 'nanoid';

/**
 * MemWal Client & Memory Manager
 * Manages semantic recall, durable fact recording, and Walrus synchronization.
 */
export class MemWalClient {
  private profile: Gaid3UserProfile;
  private walrusService: WalrusBlobService;
  private isAuthenticated: boolean = false;

  constructor(initialProfile?: Partial<Gaid3UserProfile>) {
    this.walrusService = new WalrusBlobService();
    this.profile = {
      experienceLevel: initialProfile?.experienceLevel || 'beginner',
      preferredWallets: initialProfile?.preferredWallets || [],
      preferredChains: initialProfile?.preferredChains || [],
      riskTolerance: initialProfile?.riskTolerance || 'very_low',
      goals: initialProfile?.goals || [],
      mistakes: initialProfile?.mistakes || [],
      checklists: initialProfile?.checklists || [],
      rawDurableFacts: initialProfile?.rawDurableFacts || [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Login / authentication simulation for Walrus decentralized identity
   */
  async memwal_login(): Promise<{ status: string; walletAddress: string; message: string }> {
    this.isAuthenticated = true;
    return {
      status: 'authenticated',
      walletAddress: '0x' + Math.random().toString(16).substring(2, 42),
      message: 'Successfully connected to Walrus decentralized memory layer.'
    };
  }

  /**
   * Recall relevant user context and facts based on query
   */
  async memwal_recall(query: string): Promise<{
    facts: UserMemoryFact[];
    profile: Gaid3UserProfile;
    relevantMistakes: UserMistakeEntry[];
    relevantChecklists: UserChecklist[];
    summary: string;
  }> {
    const q = query.toLowerCase();

    // Semantic relevance filtering
    const matchingFacts = this.profile.rawDurableFacts.filter((fact) => {
      const s = fact.statement.toLowerCase();
      return (
        s.includes(q) ||
        q.includes(fact.category) ||
        (q.includes('wallet') && fact.category === 'wallet') ||
        (q.includes('chain') && fact.category === 'chain') ||
        (q.includes('mistake') && fact.category === 'mistake') ||
        (q.includes('risk') && fact.category === 'risk') ||
        (q.includes('goal') && fact.category === 'goal')
      );
    });

    const relevantMistakes = this.profile.mistakes.filter((m) =>
      q.includes(m.context.toLowerCase()) || m.context.toLowerCase().includes(q)
    );

    const relevantChecklists = this.profile.checklists.filter((c) =>
      q.includes(c.chain.toLowerCase()) || q.includes(c.title.toLowerCase())
    );

    let summaryParts: string[] = [];
    if (this.profile.experienceLevel) {
      summaryParts.push(`Level: ${this.profile.experienceLevel}`);
    }
    if (this.profile.preferredChains.length > 0) {
      summaryParts.push(`Chains: ${this.profile.preferredChains.join(', ')}`);
    }
    if (this.profile.preferredWallets.length > 0) {
      summaryParts.push(`Wallets: ${this.profile.preferredWallets.join(', ')}`);
    }
    if (this.profile.riskTolerance) {
      summaryParts.push(`Risk: ${this.profile.riskTolerance}`);
    }
    if (this.profile.goals.length > 0) {
      summaryParts.push(`Goals: ${this.profile.goals.join('; ')}`);
    }

    return {
      facts: matchingFacts.length > 0 ? matchingFacts : this.profile.rawDurableFacts,
      profile: this.profile,
      relevantMistakes: relevantMistakes.length > 0 ? relevantMistakes : this.profile.mistakes,
      relevantChecklists,
      summary: summaryParts.join(' | ') || 'No prior memory recorded yet.'
    };
  }

  /**
   * Save a single durable fact verbatim with auto-categorization
   */
  async memwal_remember(statement: string, categoryOverride?: UserMemoryFact['category']): Promise<UserMemoryFact> {
    const s = statement.trim();
    const category = categoryOverride || this.detectCategory(s);

    const newFact: UserMemoryFact = {
      id: nanoid(8),
      category,
      statement: s,
      createdAt: new Date().toISOString(),
      source: 'user_statement'
    };

    this.profile.rawDurableFacts.push(newFact);
    this.extractAndApplyToProfile(newFact);
    await this.syncToWalrus();

    return newFact;
  }

  /**
   * Save multiple facts at once
   */
  async memwal_remember_bulk(statements: string[]): Promise<UserMemoryFact[]> {
    const addedFacts: UserMemoryFact[] = [];
    for (const statement of statements) {
      if (statement.trim()) {
        const fact = await this.memwal_remember(statement);
        addedFacts.push(fact);
      }
    }
    return addedFacts;
  }

  /**
   * Analyze long narrative or story and extract durable facts
   */
  async memwal_analyze(narrative: string): Promise<{ extractedFacts: string[]; savedCount: number }> {
    const sentences = narrative
      .split(/[.\n;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    const keySentences = sentences.filter((s) => {
      const lower = s.toLowerCase();
      return (
        lower.includes('i use') ||
        lower.includes('i have') ||
        lower.includes('i prefer') ||
        lower.includes('i lost') ||
        lower.includes('my wallet') ||
        lower.includes('my goal') ||
        lower.includes('i want to') ||
        lower.includes('i am new') ||
        lower.includes('i am beginner') ||
        lower.includes('confused')
      );
    });

    const saved = await this.memwal_remember_bulk(keySentences.length > 0 ? keySentences : sentences.slice(0, 5));
    return {
      extractedFacts: saved.map((f) => f.statement),
      savedCount: saved.length
    };
  }

  /**
   * Record a completed working flow as a reusable checklist
   */
  async saveChecklist(checklist: Omit<UserChecklist, 'id'>): Promise<UserChecklist> {
    const newChecklist: UserChecklist = {
      ...checklist,
      id: nanoid(8),
      completedAt: new Date().toISOString()
    };

    this.profile.checklists.push(newChecklist);
    await this.memwal_remember(
      `Completed checklist "${newChecklist.title}" for ${newChecklist.chain}`,
      'checklist'
    );
    await this.syncToWalrus();
    return newChecklist;
  }

  /**
   * Record a mistake / scary moment to guard against in the future
   */
  async recordMistake(context: string, whatHappened: string, remedyLesson: string): Promise<UserMistakeEntry> {
    const entry: UserMistakeEntry = {
      id: nanoid(8),
      context,
      whatHappened,
      remedyLesson,
      timestamp: new Date().toISOString()
    };

    this.profile.mistakes.push(entry);
    await this.memwal_remember(
      `Past Mistake / Scary Moment in ${context}: ${whatHappened}. Lesson: ${remedyLesson}`,
      'mistake'
    );
    await this.syncToWalrus();
    return entry;
  }

  /**
   * Sync complete profile state to Walrus decentralized storage
   */
  async syncToWalrus(): Promise<{ blobId: string; epoch: number }> {
    this.profile.lastUpdated = new Date().toISOString();
    const res = await this.walrusService.storeBlob(this.profile);
    this.profile.walrusBlobId = res.blobId;
    this.profile.walrusEpoch = res.epoch;
    return {
      blobId: res.blobId,
      epoch: res.epoch
    };
  }

  /**
   * Get full in-memory profile
   */
  getProfile(): Gaid3UserProfile {
    return this.profile;
  }

  private detectCategory(statement: string): UserMemoryFact['category'] {
    const lower = statement.toLowerCase();
    if (lower.includes('wallet') || lower.includes('phantom') || lower.includes('metamask') || lower.includes('sui wallet')) {
      return 'wallet';
    }
    if (lower.includes('sui') || lower.includes('eth') || lower.includes('solana') || lower.includes('polygon') || lower.includes('chain')) {
      return 'chain';
    }
    if (lower.includes('mistake') || lower.includes('scam') || lower.includes('lost') || lower.includes('drained') || lower.includes('hacked')) {
      return 'mistake';
    }
    if (lower.includes('risk') || lower.includes('safe') || lower.includes('cautious') || lower.includes('afraid')) {
      return 'risk';
    }
    if (lower.includes('goal') || lower.includes('want to') || lower.includes('trying to') || lower.includes('hope to')) {
      return 'goal';
    }
    if (lower.includes('beginner') || lower.includes('intermediate') || lower.includes('experienced') || lower.includes('new to')) {
      return 'experience';
    }
    return 'general';
  }

  private extractAndApplyToProfile(fact: UserMemoryFact): void {
    const lower = fact.statement.toLowerCase();

    // Experience detection
    if (lower.includes('complete beginner') || lower.includes('brand new') || lower.includes('new to web3') || lower.includes('first time')) {
      this.profile.experienceLevel = 'beginner';
    } else if (lower.includes('some experience') || lower.includes('used a wallet') || lower.includes('bought some crypto')) {
      this.profile.experienceLevel = 'some_experience';
    } else if (lower.includes('intermediate') || lower.includes('defi') || lower.includes('smart contract')) {
      this.profile.experienceLevel = 'intermediate';
    }

    // Wallets detection
    const knownWallets = ['sui wallet', 'slingshot', 'suiet', 'metamask', 'phantom', 'rabby', 'rainbow', 'backpack', 'coinbase wallet'];
    for (const w of knownWallets) {
      if (lower.includes(w) && !this.profile.preferredWallets.includes(w)) {
        this.profile.preferredWallets.push(w);
      }
    }

    // Chains detection
    const knownChains = ['sui', 'ethereum', 'solana', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'walrus'];
    for (const c of knownChains) {
      if (lower.includes(c) && !this.profile.preferredChains.includes(c)) {
        this.profile.preferredChains.push(c);
      }
    }

    // Goals detection
    if (fact.category === 'goal' && !this.profile.goals.includes(fact.statement)) {
      this.profile.goals.push(fact.statement);
    }
  }
}
