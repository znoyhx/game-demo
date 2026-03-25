import { z } from 'zod';

import {
  eventLogSourceSchema,
  worldEventTypeSchema,
} from './event.schema';
import {
  eventIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
} from './shared';

export const eventDebugEventSummarySchema = z
  .object({
    eventId: eventIdSchema,
    title: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    type: worldEventTypeSchema,
    repeatable: z.boolean(),
    triggerCount: nonNegativeIntegerSchema,
    lastTriggeredAt: isoTimestampSchema.optional(),
    lastSource: eventLogSourceSchema.optional(),
    naturallyTriggerable: z.boolean(),
    naturalReasons: z.array(nonEmptyStringSchema),
    pending: z.boolean(),
    scheduled: z.boolean(),
  })
  .strict();

export const eventDebugHistoryEntrySchema = z
  .object({
    index: nonNegativeIntegerSchema,
    eventId: eventIdSchema,
    title: nonEmptyStringSchema,
    triggeredAt: isoTimestampSchema,
    source: eventLogSourceSchema,
  })
  .strict();

export const eventDebugDirectorSnapshotSchema = z
  .object({
    randomnessDisabled: z.boolean(),
    worldTension: nonNegativeIntegerSchema,
    pacingNote: nonEmptyStringSchema.optional(),
    pendingEventIds: z.array(eventIdSchema),
    scheduledEventIds: z.array(eventIdSchema),
    revealedClueCount: nonNegativeIntegerSchema,
    shopModifierCount: nonNegativeIntegerSchema,
    factionConflictCount: nonNegativeIntegerSchema,
  })
  .strict();

export const eventDebugOutcomeModeSchema = z.enum([
  'manual-trigger',
  'history-replay',
]);

export const eventDebugOutcomeSchema = z
  .object({
    mode: eventDebugOutcomeModeSchema,
    eventId: eventIdSchema,
    title: nonEmptyStringSchema,
    triggeredAt: isoTimestampSchema,
    actualSource: z.literal('debug'),
    replayedFromIndex: nonNegativeIntegerSchema.optional(),
    replayedFromTriggeredAt: isoTimestampSchema.optional(),
    naturalEvaluationOk: z.boolean(),
    naturalReasons: z.array(nonEmptyStringSchema),
    changeSummary: z.array(nonEmptyStringSchema),
    directorAfter: eventDebugDirectorSnapshotSchema,
  })
  .strict();

export const eventDebugSnapshotSchema = z
  .object({
    events: z.array(eventDebugEventSummarySchema),
    history: z.array(eventDebugHistoryEntrySchema),
    director: eventDebugDirectorSnapshotSchema,
  })
  .strict();

export const eventDebugReplayRequestSchema = z
  .object({
    historyIndex: nonNegativeIntegerSchema,
  })
  .strict();

export type EventDebugEventSummary = z.infer<typeof eventDebugEventSummarySchema>;
export type EventDebugHistoryEntry = z.infer<typeof eventDebugHistoryEntrySchema>;
export type EventDebugDirectorSnapshot = z.infer<
  typeof eventDebugDirectorSnapshotSchema
>;
export type EventDebugOutcomeMode = z.infer<typeof eventDebugOutcomeModeSchema>;
export type EventDebugOutcome = z.infer<typeof eventDebugOutcomeSchema>;
export type EventDebugSnapshot = z.infer<typeof eventDebugSnapshotSchema>;
export type EventDebugReplayRequest = z.infer<
  typeof eventDebugReplayRequestSchema
>;
