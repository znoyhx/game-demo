import { z } from 'zod';

import {
  areaIdSchema,
  eventIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  npcIdSchema,
  questIdSchema,
} from './shared';
import { playerProfileTagSchema } from './player.schema';

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
    requiredNpcId: npcIdSchema.optional(),
    requiredPlayerTag: playerProfileTagSchema.optional(),
    requiredWorldFlag: nonEmptyStringSchema.optional(),
  })
  .strict();

export const eventEffectSchema = z
  .object({
    setWorldFlags: z.array(nonEmptyStringSchema).optional(),
    unlockAreaIds: z.array(areaIdSchema).optional(),
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
  })
  .strict();

export const worldEventSchema = z
  .object({
    id: eventIdSchema,
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

export const eventDirectorStateSchema = z
  .object({
    pendingEventIds: z.array(eventIdSchema),
    worldTension: nonNegativeIntegerSchema,
    pacingNote: nonEmptyStringSchema.optional(),
    randomnessDisabled: z.boolean(),
  })
  .strict();

export type EventTriggerType = z.infer<typeof eventTriggerTypeSchema>;
export type EventTriggerCondition = z.infer<typeof eventTriggerConditionSchema>;
export type EventEffect = z.infer<typeof eventEffectSchema>;
export type WorldEvent = z.infer<typeof worldEventSchema>;
export type EventLogSource = z.infer<typeof eventLogSourceSchema>;
export type EventLogEntry = z.infer<typeof eventLogEntrySchema>;
export type EventDirectorState = z.infer<typeof eventDirectorStateSchema>;
