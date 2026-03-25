import { z } from 'zod';

import {
  combatPhaseChangeSchema,
  combatPlayerBehaviorSummarySchema,
  combatResultSchema,
  combatTacticChangeSchema,
  enemyTacticTypeSchema,
} from './combat.schema';
import {
  encounterIdSchema,
  genericIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  positiveIntegerSchema,
  nonNegativeIntegerSchema,
} from './shared';
import { playerProfileTagSchema } from './player.schema';

export const explanationTypeSchema = z.enum(['npc', 'quest', 'combat', 'playerModel', 'event']);

export const explanationItemSchema = z
  .object({
    type: explanationTypeSchema,
    title: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    evidence: z.array(nonEmptyStringSchema).optional(),
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
    encounterId: encounterIdSchema.optional(),
    playerTags: z.array(playerProfileTagSchema),
    combatSummary: reviewCombatSummarySchema.nullable(),
    keyEvents: z.array(nonEmptyStringSchema),
    explanations: z.array(explanationItemSchema),
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
export type ReviewCombatResultSummary = z.infer<
  typeof reviewCombatResultSummarySchema
>;
export type ReviewCombatSummary = z.infer<typeof reviewCombatSummarySchema>;
export type ReviewPayload = z.infer<typeof reviewPayloadSchema>;
export type ReviewState = z.infer<typeof reviewStateSchema>;
