import { z } from 'zod';

import {
  areaIdSchema,
  genericIdSchema,
  nonEmptyStringSchema,
  npcIdSchema,
} from './shared';
import { worldModeSchema } from './world.schema';

export const gameDifficultySchema = z.enum(['easy', 'normal', 'hard']);

export const gameConfigStateSchema = z
  .object({
    theme: nonEmptyStringSchema,
    worldStyle: nonEmptyStringSchema,
    difficulty: gameDifficultySchema,
    gameGoal: nonEmptyStringSchema,
    learningGoal: nonEmptyStringSchema.optional(),
    storyPremise: nonEmptyStringSchema.optional(),
    preferredMode: worldModeSchema,
    templateId: nonEmptyStringSchema.optional(),
    quickStartEnabled: z.boolean(),
    devModeEnabled: z.boolean(),
    autosaveEnabled: z.boolean(),
    autoLoadEnabled: z.boolean(),
    presentationModeEnabled: z.boolean(),
  })
  .strict();

export const resourceKindSchema = z.enum([
  'tileset',
  'background',
  'music',
  'avatar',
  'effect',
]);

export const resourceDefinitionSchema = z
  .object({
    id: genericIdSchema,
    kind: resourceKindSchema,
    key: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    areaId: areaIdSchema.optional(),
    npcId: npcIdSchema.optional(),
    source: nonEmptyStringSchema.optional(),
  })
  .strict();

export const resourceStateSchema = z
  .object({
    activeTheme: nonEmptyStringSchema,
    entries: z.array(resourceDefinitionSchema),
    loadedResourceKeys: z.array(nonEmptyStringSchema),
    selectedBackgroundKey: nonEmptyStringSchema.optional(),
    selectedTilesetKey: nonEmptyStringSchema.optional(),
    selectedMusicKey: nonEmptyStringSchema.optional(),
  })
  .strict();

export type GameDifficulty = z.infer<typeof gameDifficultySchema>;
export type GameConfigState = z.infer<typeof gameConfigStateSchema>;
export type ResourceKind = z.infer<typeof resourceKindSchema>;
export type ResourceDefinition = z.infer<typeof resourceDefinitionSchema>;
export type ResourceState = z.infer<typeof resourceStateSchema>;
