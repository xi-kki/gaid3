import { z } from 'zod';

export type ExperienceLevel = 'beginner' | 'some_experience' | 'intermediate' | 'advanced';
export type RiskTolerance = 'very_low' | 'moderate' | 'high';

export interface UserMemoryFact {
  id: string;
  category: 'experience' | 'wallet' | 'chain' | 'mistake' | 'risk' | 'goal' | 'checklist' | 'general';
  statement: string;
  createdAt: string;
  source: 'user_statement' | 'checklist_saved' | 'incident_report';
  walrusBlobId?: string;
}

export interface UserChecklist {
  id: string;
  title: string;
  description: string;
  chain: string;
  steps: {
    stepNumber: number;
    title: string;
    action: string;
    isRisky: boolean;
    cautionNote?: string;
    completed: boolean;
  }[];
  completedAt?: string;
  walrusBlobId?: string;
}

export interface UserMistakeEntry {
  id: string;
  context: string;
  whatHappened: string;
  remedyLesson: string;
  timestamp: string;
}

export interface Gaid3UserProfile {
  experienceLevel: ExperienceLevel;
  preferredWallets: string[];
  preferredChains: string[];
  riskTolerance: RiskTolerance;
  goals: string[];
  mistakes: UserMistakeEntry[];
  checklists: UserChecklist[];
  rawDurableFacts: UserMemoryFact[];
  lastUpdated: string;
  walrusEpoch?: number;
  walrusBlobId?: string;
}

export const UserMemoryFactSchema = z.object({
  id: z.string(),
  category: z.enum(['experience', 'wallet', 'chain', 'mistake', 'risk', 'goal', 'checklist', 'general']),
  statement: z.string(),
  createdAt: z.string(),
  source: z.enum(['user_statement', 'checklist_saved', 'incident_report']),
  walrusBlobId: z.string().optional()
});

export const UserProfileSchema = z.object({
  experienceLevel: z.enum(['beginner', 'some_experience', 'intermediate', 'advanced']),
  preferredWallets: z.array(z.string()),
  preferredChains: z.array(z.string()),
  riskTolerance: z.enum(['very_low', 'moderate', 'high']),
  goals: z.array(z.string()),
  mistakes: z.array(
    z.object({
      id: z.string(),
      context: z.string(),
      whatHappened: z.string(),
      remedyLesson: z.string(),
      timestamp: z.string()
    })
  ),
  checklists: z.array(z.any()),
  rawDurableFacts: z.array(UserMemoryFactSchema),
  lastUpdated: z.string(),
  walrusEpoch: z.number().optional(),
  walrusBlobId: z.string().optional()
});
