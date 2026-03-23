import { z } from 'zod';

import {
  areaIdSchema,
  isoTimestampSchema,
  itemIdSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  nonEmptyStringSchema,
} from './shared';

export const playerProfileTagSchema = z.enum([
  'exploration',
  'combat',
  'story',
  'social',
  'speedrun',
  'cautious',
  'risky',
]);

export const playerInventoryEntrySchema = z
  .object({
    itemId: itemIdSchema,
    quantity: positiveIntegerSchema,
  })
  .strict();

export const playerStateSchema = z
  .object({
    hp: nonNegativeIntegerSchema,
    maxHp: positiveIntegerSchema,
    energy: nonNegativeIntegerSchema.optional(),
    gold: nonNegativeIntegerSchema,
    inventory: z.array(playerInventoryEntrySchema),
    profileTags: z.array(playerProfileTagSchema),
    currentAreaId: areaIdSchema,
  })
  .strict();

export const playerModelStateSchema = z
  .object({
    tags: z.array(playerProfileTagSchema),
    rationale: z.array(nonEmptyStringSchema),
    recentAreaVisits: z.array(areaIdSchema),
    recentQuestChoices: z.array(nonEmptyStringSchema),
    npcInteractionCount: nonNegativeIntegerSchema,
    dominantStyle: playerProfileTagSchema.optional(),
    riskForecast: nonEmptyStringSchema.optional(),
    stuckPoint: nonEmptyStringSchema.optional(),
    lastUpdatedAt: isoTimestampSchema.optional(),
  })
  .strict();

export type PlayerProfileTag = z.infer<typeof playerProfileTagSchema>;
export type PlayerInventoryEntry = z.infer<typeof playerInventoryEntrySchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type PlayerModelState = z.infer<typeof playerModelStateSchema>;
