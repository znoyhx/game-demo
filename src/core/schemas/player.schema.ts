import { z } from 'zod';

import { combatCommandActionSchema } from './combat.schema';
import { npcDialogueIntentSchema } from './npc.schema';
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

export const playerModelDebugSourceSchema = z.enum([
  'manual-tags',
  'behavior-replay',
  'preset-scenario',
]);

export const playerModelDebugMarkerSchema = z
  .object({
    injected: z.boolean().default(true),
    source: playerModelDebugSourceSchema,
    label: nonEmptyStringSchema,
  })
  .strict();

export const createEmptyPlayerModelSignalWeights = () => ({
  exploration: 0,
  combat: 0,
  social: 0,
  story: 0,
  speedrun: 0,
  cautious: 0,
  risky: 0,
});

export const playerModelSignalWeightsSchema = z
  .object({
    exploration: nonNegativeIntegerSchema.default(0),
    combat: nonNegativeIntegerSchema.default(0),
    social: nonNegativeIntegerSchema.default(0),
    story: nonNegativeIntegerSchema.default(0),
    speedrun: nonNegativeIntegerSchema.default(0),
    cautious: nonNegativeIntegerSchema.default(0),
    risky: nonNegativeIntegerSchema.default(0),
  })
  .strict();

export const playerModelBehaviorReplayStepSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('area-visit'),
      areaId: areaIdSchema,
      appendRecentVisit: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('exploration-search'),
      resourceFound: z.boolean().optional(),
      triggeredAmbush: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('combat-choice'),
      actionType: combatCommandActionSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('npc-interaction'),
      intent: npcDialogueIntentSchema,
      trustDelta: z.number().int().optional(),
      relationshipDelta: z.number().int().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('quest-choice'),
      choiceId: nonEmptyStringSchema,
    })
    .strict(),
]);

export const playerModelDebugScenarioSchema = z
  .object({
    id: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    replaySteps: z.array(playerModelBehaviorReplayStepSchema).min(1),
    expectedTags: z.array(playerProfileTagSchema).default([]),
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
    recentCombatActions: z.array(combatCommandActionSchema).default([]),
    recentNpcInteractionIntents: z.array(npcDialogueIntentSchema).default([]),
    recentQuestChoices: z.array(nonEmptyStringSchema),
    npcInteractionCount: nonNegativeIntegerSchema,
    signalWeights: playerModelSignalWeightsSchema.default(
      createEmptyPlayerModelSignalWeights(),
    ),
    dominantStyle: playerProfileTagSchema.optional(),
    riskForecast: nonEmptyStringSchema.optional(),
    stuckPoint: nonEmptyStringSchema.optional(),
    debugProfile: playerModelDebugMarkerSchema.optional(),
    lastUpdatedAt: isoTimestampSchema.optional(),
  })
  .strict();

export type PlayerProfileTag = z.infer<typeof playerProfileTagSchema>;
export type PlayerInventoryEntry = z.infer<typeof playerInventoryEntrySchema>;
export type PlayerModelDebugSource = z.infer<typeof playerModelDebugSourceSchema>;
export type PlayerModelDebugMarker = z.infer<typeof playerModelDebugMarkerSchema>;
export type PlayerModelSignalWeights = z.infer<
  typeof playerModelSignalWeightsSchema
>;
export type PlayerModelBehaviorReplayStep = z.infer<
  typeof playerModelBehaviorReplayStepSchema
>;
export type PlayerModelDebugScenario = z.infer<
  typeof playerModelDebugScenarioSchema
>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type PlayerModelState = z.infer<typeof playerModelStateSchema>;
