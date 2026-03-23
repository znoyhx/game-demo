import { z } from 'zod';

const createIdSchema = (label: string) => z.string().trim().min(1, `${label} is required`);

export const nonEmptyStringSchema = z.string().trim().min(1);
export const finiteNumberSchema = z.number().finite();
export const nonNegativeIntegerSchema = z.number().int().min(0);
export const positiveIntegerSchema = z.number().int().positive();
export const trustScoreSchema = z.number().min(0).max(100);
export const relationshipScoreSchema = z.number().min(-100).max(100);
export const booleanFlagRecordSchema = z.record(z.boolean());

export const isoTimestampSchema = z.string().datetime({ offset: true });
export const schemaVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'schema version must use semver');

export const worldIdSchema = createIdSchema('world id');
export const areaIdSchema = createIdSchema('area id');
export const questIdSchema = createIdSchema('quest id');
export const npcIdSchema = createIdSchema('npc id');
export const eventIdSchema = createIdSchema('event id');
export const encounterIdSchema = createIdSchema('encounter id');
export const saveIdSchema = createIdSchema('save id');
export const factionIdSchema = createIdSchema('faction id');
export const itemIdSchema = createIdSchema('item id');
export const genericIdSchema = createIdSchema('id');

export const schemaOwnerSchema = z.enum([
  'world',
  'area',
  'quest',
  'npc',
  'player',
  'config',
  'event',
  'combat',
  'review',
  'save',
  'session',
  'agent',
]);

export type SchemaOwner = z.infer<typeof schemaOwnerSchema>;
