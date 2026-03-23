import { z } from 'zod';

import {
  areaIdSchema,
  booleanFlagRecordSchema,
  factionIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  worldIdSchema,
} from './shared';

export const worldToneSchema = z.enum(['light', 'neutral', 'dark', 'mysterious']);
export const worldModeSchema = z.enum(['story', 'exploration', 'combat', 'hybrid']);
export const factionStanceSchema = z.enum(['friendly', 'neutral', 'hostile', 'hidden']);

export const worldSummarySchema = z
  .object({
    id: worldIdSchema,
    name: nonEmptyStringSchema,
    subtitle: nonEmptyStringSchema.optional(),
    theme: nonEmptyStringSchema,
    tone: worldToneSchema,
    mode: worldModeSchema,
    createdAt: isoTimestampSchema,
  })
  .strict();

export const factionSchema = z
  .object({
    id: factionIdSchema,
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    stance: factionStanceSchema,
  })
  .strict();

export const worldFlagsSchema = booleanFlagRecordSchema;

export const worldSchema = z
  .object({
    summary: worldSummarySchema,
    factions: z.array(factionSchema),
    areaIds: z.array(areaIdSchema),
    startingAreaId: areaIdSchema,
    weather: nonEmptyStringSchema.optional(),
    timeOfDay: nonEmptyStringSchema.optional(),
    flags: worldFlagsSchema,
  })
  .strict();

export type WorldTone = z.infer<typeof worldToneSchema>;
export type WorldMode = z.infer<typeof worldModeSchema>;
export type FactionStance = z.infer<typeof factionStanceSchema>;
export type WorldSummary = z.infer<typeof worldSummarySchema>;
export type Faction = z.infer<typeof factionSchema>;
export type WorldFlags = z.infer<typeof worldFlagsSchema>;
export type World = z.infer<typeof worldSchema>;
