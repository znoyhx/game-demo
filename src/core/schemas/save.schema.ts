import { z } from 'zod';

import { areaSchema } from './area.schema';
import { combatStateSchema } from './combat.schema';
import { eventLogEntrySchema, worldEventSchema } from './event.schema';
import { npcDefinitionSchema, npcStateSchema } from './npc.schema';
import { playerStateSchema } from './player.schema';
import { questDefinitionSchema, questProgressSchema } from './quest.schema';
import { reviewPayloadSchema } from './review.schema';
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
    quests: z
      .object({
        definitions: z.array(questDefinitionSchema),
        progress: z.array(questProgressSchema),
      })
      .strict(),
    npcs: z
      .object({
        definitions: z.array(npcDefinitionSchema),
        runtime: z.array(npcStateSchema),
      })
      .strict(),
    player: playerStateSchema,
    events: z
      .object({
        definitions: z.array(worldEventSchema),
        history: z.array(eventLogEntrySchema),
      })
      .strict(),
    combat: combatStateSchema.nullable().optional(),
    review: reviewPayloadSchema.nullable().optional(),
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
