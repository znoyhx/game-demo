import { z } from 'zod';

import {
  areaIdSchema,
  encounterIdSchema,
  eventIdSchema,
  finiteNumberSchema,
  genericIdSchema,
  itemIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
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

export const interactionTravelModeSchema = z.enum(['walk', 'teleport']);

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
    travelMode: interactionTravelModeSchema.optional(),
  })
  .strict();

export const areaEnterConditionSchema = z
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

export const areaUnlockConditionSchema = areaEnterConditionSchema;

export const enemySpawnTriggerSchema = z.enum([
  'always',
  'on-enter',
  'on-search',
  'on-event',
  'on-alert',
]);

export const enemySpawnRuleSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    trigger: enemySpawnTriggerSchema,
    encounterId: encounterIdSchema.optional(),
    enemyNpcId: npcIdSchema.optional(),
    enemyArchetype: nonEmptyStringSchema.optional(),
    spawnWeight: positiveIntegerSchema,
    maxActive: positiveIntegerSchema,
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
    blockedWorldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const resourceNodeKindSchema = z.enum([
  'supply',
  'ore',
  'herb',
  'relic',
  'ember',
  'cache',
]);

export const resourceNodeSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    kind: resourceNodeKindSchema,
    itemId: itemIdSchema.optional(),
    quantity: positiveIntegerSchema,
    renewable: z.boolean(),
    discoveredByDefault: z.boolean(),
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const areaEnvironmentHazardSchema = z.enum(['stable', 'tense', 'volatile']);

export const areaEnvironmentActivationSchema = z
  .object({
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
    blockedWorldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const areaEnvironmentStateSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    weather: nonEmptyStringSchema.optional(),
    lighting: nonEmptyStringSchema.optional(),
    hazard: areaEnvironmentHazardSchema,
    note: nonEmptyStringSchema.optional(),
    activation: areaEnvironmentActivationSchema.optional(),
  })
  .strict();

export const areaEnvironmentSchema = z
  .object({
    activeStateId: genericIdSchema.optional(),
    states: z.array(areaEnvironmentStateSchema).min(1),
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
    isHiddenUntilDiscovered: z.boolean().optional(),
    enterCondition: areaEnterConditionSchema.optional(),
    unlockCondition: areaUnlockConditionSchema.optional(),
    npcIds: z.array(npcIdSchema),
    interactionPoints: z.array(interactionPointSchema),
    enemySpawnRules: z.array(enemySpawnRuleSchema),
    eventIds: z.array(eventIdSchema),
    resourceNodes: z.array(resourceNodeSchema),
    environment: areaEnvironmentSchema,
    connectedAreaIds: z.array(nonEmptyStringSchema),
    backgroundKey: nonEmptyStringSchema.optional(),
    musicKey: nonEmptyStringSchema.optional(),
  })
  .strict();

export const mapStateSchema = z
  .object({
    currentAreaId: areaIdSchema,
    discoveredAreaIds: z.array(areaIdSchema),
    unlockedAreaIds: z.array(areaIdSchema),
    visitHistory: z.array(areaIdSchema),
  })
  .strict();

export type AreaType = z.infer<typeof areaTypeSchema>;
export type InteractionTravelMode = z.infer<typeof interactionTravelModeSchema>;
export type InteractionPointType = z.infer<typeof interactionPointTypeSchema>;
export type InteractionPoint = z.infer<typeof interactionPointSchema>;
export type AreaEnterCondition = z.infer<typeof areaEnterConditionSchema>;
export type AreaUnlockCondition = z.infer<typeof areaUnlockConditionSchema>;
export type EnemySpawnTrigger = z.infer<typeof enemySpawnTriggerSchema>;
export type EnemySpawnRule = z.infer<typeof enemySpawnRuleSchema>;
export type ResourceNodeKind = z.infer<typeof resourceNodeKindSchema>;
export type ResourceNode = z.infer<typeof resourceNodeSchema>;
export type AreaEnvironmentHazard = z.infer<typeof areaEnvironmentHazardSchema>;
export type AreaEnvironmentActivation = z.infer<typeof areaEnvironmentActivationSchema>;
export type AreaEnvironmentState = z.infer<typeof areaEnvironmentStateSchema>;
export type AreaEnvironment = z.infer<typeof areaEnvironmentSchema>;
export type Area = z.infer<typeof areaSchema>;
export type MapState = z.infer<typeof mapStateSchema>;
