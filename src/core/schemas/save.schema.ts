import { z } from 'zod';

import { gameConfigStateSchema, resourceStateSchema } from './config.schema';
import { mapStateSchema } from './area.schema';
import { areaSchema } from './area.schema';
import {
  combatEncounterDefinitionSchema,
  combatHistoryEntrySchema,
  combatStateSchema,
} from './combat.schema';
import {
  eventDirectorStateSchema,
  eventLogEntrySchema,
  worldEventSchema,
} from './event.schema';
import { explorationStateSchema } from './exploration.schema';
import { npcDefinitionSchema, npcStateSchema } from './npc.schema';
import { playerModelStateSchema, playerStateSchema } from './player.schema';
import {
  questDefinitionSchema,
  questHistoryEntrySchema,
  questProgressSchema,
} from './quest.schema';
import { reviewPayloadSchema, reviewStateSchema } from './review.schema';
import {
  isoTimestampSchema,
  nonEmptyStringSchema,
  saveIdSchema,
  schemaVersionSchema,
} from './shared';
import { worldSchema } from './world.schema';

export const saveSourceSchema = z.enum(['auto', 'manual', 'debug']);

export const saveMetadataSchema = z
  .object({
    id: saveIdSchema,
    version: schemaVersionSchema,
    slot: nonEmptyStringSchema.optional(),
    label: nonEmptyStringSchema.optional(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
    source: saveSourceSchema,
  })
  .strict();

export const saveSnapshotSchema = z
  .object({
    metadata: saveMetadataSchema,
    world: worldSchema,
    areas: z.array(areaSchema),
    map: mapStateSchema.optional(),
    quests: z
      .object({
        definitions: z.array(questDefinitionSchema),
        progress: z.array(questProgressSchema),
        history: z.array(questHistoryEntrySchema).default([]),
      })
      .strict(),
    npcs: z
      .object({
        definitions: z.array(npcDefinitionSchema),
        runtime: z.array(npcStateSchema),
      })
      .strict(),
    player: playerStateSchema,
    playerModel: playerModelStateSchema.optional(),
    events: z
      .object({
        definitions: z.array(worldEventSchema),
        history: z.array(eventLogEntrySchema),
        director: eventDirectorStateSchema
          .default({
            pendingEventIds: [],
            scheduledEvents: [],
            worldTension: 0,
            randomnessDisabled: false,
            revealedClues: [],
            shopPriceModifiers: [],
            factionConflicts: [],
          }),
      })
      .strict(),
    combatSystem: z
      .object({
        encounters: z.array(combatEncounterDefinitionSchema).default([]),
        active: combatStateSchema.nullable().default(null),
        history: z.array(combatHistoryEntrySchema).default([]),
      })
      .strict()
      .optional(),
    combat: combatStateSchema.nullable().optional(),
    config: gameConfigStateSchema.optional(),
    resources: resourceStateSchema.optional(),
    review: reviewPayloadSchema.nullable().optional(),
    reviewState: reviewStateSchema.optional(),
    exploration: explorationStateSchema.optional(),
  })
  .strict();

export const loadFailureReasonSchema = z.enum(['missing', 'invalid', 'corrupt', 'migration-failed']);

export const loadResultSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      snapshot: saveSnapshotSchema,
      reason: z.undefined().optional(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      snapshot: z.undefined().optional(),
      reason: loadFailureReasonSchema.optional(),
    })
    .strict(),
]);

export type SaveSource = z.infer<typeof saveSourceSchema>;
export type SaveMetadata = z.infer<typeof saveMetadataSchema>;
export type SaveSnapshot = z.infer<typeof saveSnapshotSchema>;
export type LoadFailureReason = z.infer<typeof loadFailureReasonSchema>;
export type LoadResult = z.infer<typeof loadResultSchema>;
