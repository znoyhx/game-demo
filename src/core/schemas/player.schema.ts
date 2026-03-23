import { z } from 'zod';

import {
  areaIdSchema,
  itemIdSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
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

export type PlayerProfileTag = z.infer<typeof playerProfileTagSchema>;
export type PlayerInventoryEntry = z.infer<typeof playerInventoryEntrySchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
