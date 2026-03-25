import { z } from 'zod';

import {
  combatPhaseChangeSchema,
  combatPlayerBehaviorSummarySchema,
  combatResultSchema,
  combatTacticChangeSchema,
  enemyTacticTypeSchema,
} from './combat.schema';
import { npcInteractionExplanationSchema } from './npc.schema';
import { playerModelStateSchema, playerProfileTagSchema } from './player.schema';
import { questStatusSchema } from './quest.schema';
import {
  encounterIdSchema,
  eventIdSchema,
  genericIdSchema,
  isoTimestampSchema,
  npcIdSchema,
  nonEmptyStringSchema,
  positiveIntegerSchema,
  nonNegativeIntegerSchema,
  questIdSchema,
} from './shared';

export const explanationTypeSchema = z.enum(['npc', 'quest', 'combat', 'playerModel', 'event']);

export const reviewTriggerTypeSchema = z.enum([
  'combat',
  'quest-branch',
  'npc-interaction',
  'run-complete',
  'run-failed',
  'manual',
]);

export const explanationItemSchema = z
  .object({
    type: explanationTypeSchema,
    title: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    evidence: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const reviewPlayerModelSnapshotSchema = playerModelStateSchema
  .pick({
    tags: true,
    dominantStyle: true,
    rationale: true,
    riskForecast: true,
    stuckPoint: true,
    debugProfile: true,
  })
  .strict();

export const reviewQuestBranchReasonSchema = z
  .object({
    questId: questIdSchema,
    questTitle: nonEmptyStringSchema,
    branchId: genericIdSchema.optional(),
    branchLabel: nonEmptyStringSchema.optional(),
    status: questStatusSchema,
    summary: nonEmptyStringSchema,
    reasons: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const reviewNpcAttitudeReasonSchema = z
  .object({
    npcId: npcIdSchema,
    npcName: nonEmptyStringSchema,
    attitudeLabel: nonEmptyStringSchema,
    emotionalStateLabel: nonEmptyStringSchema,
    trustDelta: z.number().int().min(-100).max(100),
    relationshipDelta: z.number().int().min(-100).max(100),
    summary: nonEmptyStringSchema,
    reasons: z.array(nonEmptyStringSchema).default([]),
    decisionBasis: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const reviewEnemyTacticReasonSchema = z
  .object({
    turn: positiveIntegerSchema,
    fromTactic: enemyTacticTypeSchema.optional(),
    toTactic: enemyTacticTypeSchema,
    phaseId: genericIdSchema.optional(),
    summary: nonEmptyStringSchema,
    reasons: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const reviewOutcomeFactorKindSchema = z.enum([
  'success',
  'failure',
  'risk',
  'opportunity',
]);

export const reviewOutcomeFactorSchema = z
  .object({
    kind: reviewOutcomeFactorKindSchema,
    title: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    evidence: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const reviewKnowledgeSummarySchema = z
  .object({
    extensionKey: z.literal('education-mode'),
    title: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    keyPoints: z.array(nonEmptyStringSchema).default([]),
    suggestedPrompt: nonEmptyStringSchema.optional(),
  })
  .strict();

export const reviewQuestBranchContextSchema = z
  .object({
    questId: questIdSchema,
    questTitle: nonEmptyStringSchema,
    branchId: genericIdSchema.optional(),
    branchLabel: nonEmptyStringSchema.optional(),
    status: questStatusSchema,
    summary: nonEmptyStringSchema,
    reasons: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const reviewNpcInteractionContextSchema = z
  .object({
    npcId: npcIdSchema,
    npcName: nonEmptyStringSchema,
    explanation: npcInteractionExplanationSchema,
    unlockedQuestIds: z.array(questIdSchema).default([]),
    isMajor: z.boolean().default(true),
  })
  .strict();

export const reviewRunOutcomeContextSchema = z
  .object({
    result: z.enum(['completed', 'failed']),
    questId: questIdSchema.optional(),
    questTitle: nonEmptyStringSchema.optional(),
    summary: nonEmptyStringSchema,
    reasons: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const reviewRequestSchema = z
  .object({
    trigger: reviewTriggerTypeSchema,
    questBranch: reviewQuestBranchContextSchema.optional(),
    npcInteraction: reviewNpcInteractionContextSchema.optional(),
    runOutcome: reviewRunOutcomeContextSchema.optional(),
  })
  .strict();

export const reviewReconstructionTargetSchema = z
  .object({
    trigger: reviewTriggerTypeSchema.optional(),
    encounterId: encounterIdSchema.optional(),
    combatHistoryIndex: nonNegativeIntegerSchema.optional(),
    questId: questIdSchema.optional(),
    questHistoryIndex: nonNegativeIntegerSchema.optional(),
    npcId: npcIdSchema.optional(),
    eventId: eventIdSchema.optional(),
    eventHistoryIndex: nonNegativeIntegerSchema.optional(),
  })
  .strict();

export const reviewCombatResultSummarySchema = z
  .object({
    result: combatResultSchema,
    totalTurns: positiveIntegerSchema,
    finalTactic: enemyTacticTypeSchema,
    finalPhaseId: genericIdSchema.optional(),
    playerRemainingHp: nonNegativeIntegerSchema,
    enemyRemainingHp: nonNegativeIntegerSchema,
    summary: nonEmptyStringSchema,
  })
  .strict();

export const reviewCombatSummarySchema = z
  .object({
    result: reviewCombatResultSummarySchema,
    tacticChanges: z.array(combatTacticChangeSchema),
    phaseChanges: z.array(combatPhaseChangeSchema),
    keyPlayerBehaviors: z.array(combatPlayerBehaviorSummarySchema),
  })
  .strict();

export const reviewPayloadSchema = z
  .object({
    generatedAt: isoTimestampSchema,
    trigger: reviewTriggerTypeSchema.default('manual'),
    encounterId: encounterIdSchema.optional(),
    playerTags: z.array(playerProfileTagSchema),
    playerModelSnapshot: reviewPlayerModelSnapshotSchema.default({
      tags: [],
      rationale: [],
    }),
    combatSummary: reviewCombatSummarySchema.nullable().default(null),
    questBranchReasons: z.array(reviewQuestBranchReasonSchema).default([]),
    npcAttitudeReasons: z.array(reviewNpcAttitudeReasonSchema).default([]),
    enemyTacticReasons: z.array(reviewEnemyTacticReasonSchema).default([]),
    outcomeFactors: z.array(reviewOutcomeFactorSchema).default([]),
    keyEvents: z.array(nonEmptyStringSchema).default([]),
    nextStepSuggestions: z.array(nonEmptyStringSchema).default([]),
    knowledgeSummary: reviewKnowledgeSummarySchema.nullable().default(null),
    explanations: z.array(explanationItemSchema).default([]),
    suggestions: z.array(nonEmptyStringSchema),
  })
  .strict();

export const reviewStateSchema = z
  .object({
    current: reviewPayloadSchema.nullable(),
    history: z.array(reviewPayloadSchema),
  })
  .strict();

export type ExplanationType = z.infer<typeof explanationTypeSchema>;
export type ExplanationItem = z.infer<typeof explanationItemSchema>;
export type ReviewTriggerType = z.infer<typeof reviewTriggerTypeSchema>;
export type ReviewPlayerModelSnapshot = z.infer<typeof reviewPlayerModelSnapshotSchema>;
export type ReviewQuestBranchReason = z.infer<typeof reviewQuestBranchReasonSchema>;
export type ReviewNpcAttitudeReason = z.infer<typeof reviewNpcAttitudeReasonSchema>;
export type ReviewEnemyTacticReason = z.infer<typeof reviewEnemyTacticReasonSchema>;
export type ReviewOutcomeFactorKind = z.infer<typeof reviewOutcomeFactorKindSchema>;
export type ReviewOutcomeFactor = z.infer<typeof reviewOutcomeFactorSchema>;
export type ReviewKnowledgeSummary = z.infer<typeof reviewKnowledgeSummarySchema>;
export type ReviewQuestBranchContext = z.infer<typeof reviewQuestBranchContextSchema>;
export type ReviewNpcInteractionContext = z.infer<typeof reviewNpcInteractionContextSchema>;
export type ReviewRunOutcomeContext = z.infer<typeof reviewRunOutcomeContextSchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewReconstructionTarget = z.infer<
  typeof reviewReconstructionTargetSchema
>;
export type ReviewCombatResultSummary = z.infer<
  typeof reviewCombatResultSummarySchema
>;
export type ReviewCombatSummary = z.infer<typeof reviewCombatSummarySchema>;
export type ReviewPayload = z.infer<typeof reviewPayloadSchema>;
export type ReviewState = z.infer<typeof reviewStateSchema>;
