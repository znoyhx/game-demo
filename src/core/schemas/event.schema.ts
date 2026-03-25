import { z } from 'zod';

import {
  areaIdSchema,
  eventIdSchema,
  factionIdSchema,
  finiteNumberSchema,
  genericIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  npcIdSchema,
  questIdSchema,
  relationshipScoreSchema,
  trustScoreSchema,
} from './shared';
import { playerProfileTagSchema } from './player.schema';
import { questStatusSchema } from './quest.schema';
import { factionStanceSchema } from './world.schema';

export const worldEventTypeSchema = z.enum([
  'weather-change',
  'resource-reduction',
  'npc-movement',
  'faction-conflict',
  'hidden-clue-exposure',
  'early-boss-appearance',
  'shop-price-change',
  'area-state-change',
]);

export const eventTriggerTypeSchema = z.enum([
  'manual',
  'time',
  'location',
  'quest',
  'relationship',
  'playerModel',
  'balance',
]);

export const eventTriggerConditionSchema = z
  .object({
    type: eventTriggerTypeSchema,
    requiredAreaId: areaIdSchema.optional(),
    requiredQuestId: questIdSchema.optional(),
    requiredQuestStatus: questStatusSchema.optional(),
    requiredNpcId: npcIdSchema.optional(),
    requiredNpcTrustAtLeast: trustScoreSchema.optional(),
    requiredNpcRelationshipAtLeast: relationshipScoreSchema.optional(),
    requiredPlayerTag: playerProfileTagSchema.optional(),
    requiredWorldFlag: nonEmptyStringSchema.optional(),
    requiredTimeOfDay: nonEmptyStringSchema.optional(),
    minimumWorldTension: nonNegativeIntegerSchema.optional(),
    maximumWorldTension: nonNegativeIntegerSchema.optional(),
  })
  .strict();

export const resourceReductionEffectSchema = z
  .object({
    areaId: areaIdSchema,
    resourceNodeId: genericIdSchema.optional(),
    amount: nonNegativeIntegerSchema,
    minimumRemaining: nonNegativeIntegerSchema.optional(),
  })
  .strict();

export const npcMovementEffectSchema = z
  .object({
    npcId: npcIdSchema,
    toAreaId: areaIdSchema,
    x: finiteNumberSchema.optional(),
    y: finiteNumberSchema.optional(),
  })
  .strict();

export const factionStanceChangeEffectSchema = z
  .object({
    factionId: factionIdSchema,
    stance: factionStanceSchema,
  })
  .strict();

export const factionConflictEffectSchema = z
  .object({
    conflictId: genericIdSchema,
    label: nonEmptyStringSchema,
    sourceFactionId: factionIdSchema,
    targetFactionId: factionIdSchema,
    intensity: z.number().int().min(1).max(100),
  })
  .strict();

export const hiddenClueEffectSchema = z
  .object({
    clueId: genericIdSchema,
    label: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    areaId: areaIdSchema.optional(),
  })
  .strict();

export const shopPriceChangeEffectSchema = z
  .object({
    npcId: npcIdSchema,
    multiplier: z.number().min(0.1).max(10),
    reason: nonEmptyStringSchema.optional(),
  })
  .strict();

export const bossAppearanceEffectSchema = z
  .object({
    npcId: npcIdSchema,
    areaId: areaIdSchema,
    note: nonEmptyStringSchema.optional(),
  })
  .strict();

export const eventEffectSchema = z
  .object({
    setWorldFlags: z.array(nonEmptyStringSchema).optional(),
    setWeather: nonEmptyStringSchema.optional(),
    setTimeOfDay: nonEmptyStringSchema.optional(),
    unlockAreaIds: z.array(areaIdSchema).optional(),
    lockAreaIds: z.array(areaIdSchema).optional(),
    startQuestIds: z.array(questIdSchema).optional(),
    updateNpcTrust: z
      .array(
        z
          .object({
            npcId: npcIdSchema,
            delta: z.number().min(-100).max(100),
          })
          .strict(),
      )
      .optional(),
    reduceResources: z.array(resourceReductionEffectSchema).optional(),
    moveNpcs: z.array(npcMovementEffectSchema).optional(),
    setFactionStances: z.array(factionStanceChangeEffectSchema).optional(),
    registerFactionConflicts: z.array(factionConflictEffectSchema).optional(),
    revealClues: z.array(hiddenClueEffectSchema).optional(),
    setShopPriceModifiers: z.array(shopPriceChangeEffectSchema).optional(),
    bossAppearances: z.array(bossAppearanceEffectSchema).optional(),
  })
  .strict();

export const worldEventSchema = z
  .object({
    id: eventIdSchema,
    type: worldEventTypeSchema,
    title: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    triggerConditions: z.array(eventTriggerConditionSchema),
    effects: eventEffectSchema,
    repeatable: z.boolean(),
  })
  .strict();

export const eventLogSourceSchema = z.union([eventTriggerTypeSchema, z.literal('debug')]);

export const eventLogEntrySchema = z
  .object({
    eventId: eventIdSchema,
    triggeredAt: isoTimestampSchema,
    source: eventLogSourceSchema,
  })
  .strict();

export const scheduledEventStateSchema = z
  .object({
    eventId: eventIdSchema,
    scheduledBy: z.enum(['game-master', 'system']),
    reason: nonEmptyStringSchema.optional(),
  })
  .strict();

export const revealedClueStateSchema = hiddenClueEffectSchema.extend({
  sourceEventId: eventIdSchema,
  revealedAt: isoTimestampSchema,
});

export const shopPriceModifierStateSchema = shopPriceChangeEffectSchema.extend({
  sourceEventId: eventIdSchema,
  changedAt: isoTimestampSchema,
});

export const factionConflictStateSchema = factionConflictEffectSchema.extend({
  sourceEventId: eventIdSchema,
  startedAt: isoTimestampSchema,
});

export const eventDirectorStateSchema = z
  .object({
    pendingEventIds: z.array(eventIdSchema),
    scheduledEvents: z.array(scheduledEventStateSchema).default([]),
    worldTension: nonNegativeIntegerSchema,
    pacingNote: nonEmptyStringSchema.optional(),
    randomnessDisabled: z.boolean(),
    revealedClues: z.array(revealedClueStateSchema).default([]),
    shopPriceModifiers: z.array(shopPriceModifierStateSchema).default([]),
    factionConflicts: z.array(factionConflictStateSchema).default([]),
  })
  .strict();

export type WorldEventType = z.infer<typeof worldEventTypeSchema>;
export type EventTriggerType = z.infer<typeof eventTriggerTypeSchema>;
export type EventTriggerCondition = z.infer<typeof eventTriggerConditionSchema>;
export type ResourceReductionEffect = z.infer<typeof resourceReductionEffectSchema>;
export type NpcMovementEffect = z.infer<typeof npcMovementEffectSchema>;
export type FactionStanceChangeEffect = z.infer<typeof factionStanceChangeEffectSchema>;
export type FactionConflictEffect = z.infer<typeof factionConflictEffectSchema>;
export type HiddenClueEffect = z.infer<typeof hiddenClueEffectSchema>;
export type ShopPriceChangeEffect = z.infer<typeof shopPriceChangeEffectSchema>;
export type BossAppearanceEffect = z.infer<typeof bossAppearanceEffectSchema>;
export type EventEffect = z.infer<typeof eventEffectSchema>;
export type WorldEvent = z.infer<typeof worldEventSchema>;
export type EventLogSource = z.infer<typeof eventLogSourceSchema>;
export type EventLogEntry = z.infer<typeof eventLogEntrySchema>;
export type ScheduledEventState = z.infer<typeof scheduledEventStateSchema>;
export type RevealedClueState = z.infer<typeof revealedClueStateSchema>;
export type ShopPriceModifierState = z.infer<typeof shopPriceModifierStateSchema>;
export type FactionConflictState = z.infer<typeof factionConflictStateSchema>;
export type EventDirectorState = z.infer<typeof eventDirectorStateSchema>;
