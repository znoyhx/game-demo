import { z } from 'zod';

import { gameConfigStateSchema } from './config.schema';
import { saveSnapshotSchema } from './save.schema';
import { nonEmptyStringSchema, nonNegativeIntegerSchema } from './shared';

export const worldCreationRequestSchema = gameConfigStateSchema
  .extend({
    promptStyle: nonEmptyStringSchema.optional(),
    saveAfterCreate: z.boolean().optional(),
  })
  .strict();

export const worldCreationTemplateSchema = z
  .object({
    id: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    request: worldCreationRequestSchema,
    featuredOutputs: z
      .object({
        regions: nonNegativeIntegerSchema,
        factions: nonNegativeIntegerSchema,
        npcs: nonNegativeIntegerSchema,
      })
      .strict(),
  })
  .strict();

export const worldCreationFallbackReasonSchema = z.enum([
  'world-architect-failed',
  'quest-designer-failed',
  'level-builder-failed',
  'npc-pack-failed',
  'event-pack-failed',
  'resource-pack-failed',
  'snapshot-invalid',
]);

export const worldCreationOutputsSchema = z
  .object({
    worldName: nonEmptyStringSchema,
    regionNames: z.array(nonEmptyStringSchema).min(1),
    factionNames: z.array(nonEmptyStringSchema).min(1),
    mainQuestSeed: nonEmptyStringSchema,
    npcNames: z.array(nonEmptyStringSchema).min(1),
    resourceLabels: z.array(nonEmptyStringSchema).min(1),
    storyPremise: nonEmptyStringSchema,
  })
  .strict();

export const worldCreationResultSchema = z
  .object({
    snapshot: saveSnapshotSchema,
    outputs: worldCreationOutputsSchema,
    usedFallback: z.boolean(),
    fallbackReason: worldCreationFallbackReasonSchema.optional(),
  })
  .strict();

export type WorldCreationRequest = z.infer<typeof worldCreationRequestSchema>;
export type WorldCreationTemplate = z.infer<typeof worldCreationTemplateSchema>;
export type WorldCreationFallbackReason = z.infer<
  typeof worldCreationFallbackReasonSchema
>;
export type WorldCreationOutputs = z.infer<typeof worldCreationOutputsSchema>;
export type WorldCreationResult = z.infer<typeof worldCreationResultSchema>;
