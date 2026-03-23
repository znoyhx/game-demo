import { z } from 'zod';

import {
  eventIdSchema,
  finiteNumberSchema,
  genericIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  npcIdSchema,
  questIdSchema,
} from './shared';

export const areaTypeSchema = z.enum([
  'town',
  'wilderness',
  'dungeon',
  'ruin',
  'shop',
  'boss',
  'hidden',
]);

export const interactionPointTypeSchema = z.enum(['npc', 'item', 'portal', 'event', 'shop', 'battle']);

export const interactionPointSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    type: interactionPointTypeSchema,
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    targetId: nonEmptyStringSchema.optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const areaUnlockConditionSchema = z
  .object({
    requiredQuestIds: z.array(questIdSchema).optional(),
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
    requiredNpcTrust: z
      .array(
        z
          .object({
            npcId: npcIdSchema,
            minTrust: z.number().min(0).max(100),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const areaSchema = z
  .object({
    id: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    type: areaTypeSchema,
    description: nonEmptyStringSchema,
    difficulty: nonNegativeIntegerSchema,
    unlockedByDefault: z.boolean(),
    unlockCondition: areaUnlockConditionSchema.optional(),
    npcIds: z.array(npcIdSchema),
    interactionPoints: z.array(interactionPointSchema),
    eventIds: z.array(eventIdSchema),
    connectedAreaIds: z.array(nonEmptyStringSchema),
    backgroundKey: nonEmptyStringSchema.optional(),
    musicKey: nonEmptyStringSchema.optional(),
  })
  .strict();

export type AreaType = z.infer<typeof areaTypeSchema>;
export type InteractionPointType = z.infer<typeof interactionPointTypeSchema>;
export type InteractionPoint = z.infer<typeof interactionPointSchema>;
export type AreaUnlockCondition = z.infer<typeof areaUnlockConditionSchema>;
export type Area = z.infer<typeof areaSchema>;
