import { z } from 'zod';

import { enemySpawnTriggerSchema } from './area.schema';
import {
  areaIdSchema,
  encounterIdSchema,
  finiteNumberSchema,
  genericIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
} from './shared';

export const explorationEncounterSignalStatusSchema = z.enum([
  'pending',
  'engaged',
  'resolved',
]);

export const explorationEncounterSignalSchema = z
  .object({
    id: genericIdSchema,
    areaId: areaIdSchema,
    ruleId: genericIdSchema,
    label: nonEmptyStringSchema,
    encounterId: encounterIdSchema,
    trigger: enemySpawnTriggerSchema,
    status: explorationEncounterSignalStatusSchema,
    createdAt: isoTimestampSchema,
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    sourceInteractionId: genericIdSchema.optional(),
    enemyArchetype: nonEmptyStringSchema.optional(),
  })
  .strict();

export const explorationRuleStateSchema = z
  .object({
    areaId: areaIdSchema,
    ruleId: genericIdSchema,
    triggerCount: nonNegativeIntegerSchema,
    lastTriggeredAt: isoTimestampSchema.optional(),
  })
  .strict();

export const explorationStateSchema = z
  .object({
    signals: z.array(explorationEncounterSignalSchema).default([]),
    ruleStates: z.array(explorationRuleStateSchema).default([]),
    searchedInteractionIds: z.array(genericIdSchema).default([]),
    collectedResourceNodeIds: z.array(genericIdSchema).default([]),
  })
  .strict();

export type ExplorationEncounterSignalStatus = z.infer<
  typeof explorationEncounterSignalStatusSchema
>;
export type ExplorationEncounterSignal = z.infer<
  typeof explorationEncounterSignalSchema
>;
export type ExplorationRuleState = z.infer<typeof explorationRuleStateSchema>;
export type ExplorationState = z.infer<typeof explorationStateSchema>;
