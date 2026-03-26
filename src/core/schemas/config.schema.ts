import { z } from 'zod';

import {
  areaIdSchema,
  finiteNumberSchema,
  genericIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  npcIdSchema,
  positiveIntegerSchema,
} from './shared';
import { worldModeSchema, worldToneSchema } from './world.schema';

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

export const difficultyPresetSchema = z
  .object({
    id: gameDifficultySchema,
    label: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    worldTone: worldToneSchema,
    defaultWeather: nonEmptyStringSchema,
    startingPlayer: z
      .object({
        hp: positiveIntegerSchema,
        maxHp: positiveIntegerSchema,
        gold: nonNegativeIntegerSchema,
        energy: nonNegativeIntegerSchema,
      })
      .strict(),
    initialWorldTension: nonNegativeIntegerSchema,
  })
  .strict();

export const combatTuningPresetSchema = z
  .object({
    id: nonEmptyStringSchema,
    difficulty: gameDifficultySchema,
    label: nonEmptyStringSchema,
    baseEnemyHp: positiveIntegerSchema,
    minimumEnemyHp: positiveIntegerSchema,
    baseEnemyHpMultiplier: finiteNumberSchema,
    playerModelBiasStep: finiteNumberSchema,
    minimumResolvedEnemyHpMultiplier: finiteNumberSchema,
    maximumResolvedEnemyHpMultiplier: finiteNumberSchema,
  })
  .strict();

export const savePolicyReasonSchema = z.enum([
  'generic',
  'area-transition',
  'quest-update',
  'npc-interaction',
  'combat-end',
  'event-trigger',
  'exploration',
  'review-generation',
  'player-model-update',
]);

export const savePolicySchema = z
  .object({
    id: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    allowManualSave: z.boolean(),
    autoLoadOnStartup: z.boolean(),
    autoSaveReasons: z.array(savePolicyReasonSchema),
  })
  .strict();

export const debugFeatureFlagsSchema = z
  .object({
    scenarioShortcuts: z.boolean(),
    areaTools: z.boolean(),
    questTools: z.boolean(),
    eventTools: z.boolean(),
    npcTools: z.boolean(),
    playerModelTools: z.boolean(),
    combatTools: z.boolean(),
    renderingTools: z.boolean(),
  })
  .strict();

export const gameShellUiSettingsSchema = z
  .object({
    maxBottomLines: positiveIntegerSchema,
    maxTips: positiveIntegerSchema,
    maxLogs: positiveIntegerSchema,
    maxRelationships: positiveIntegerSchema,
    maxVisibleQuests: positiveIntegerSchema,
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
export type DifficultyPreset = z.infer<typeof difficultyPresetSchema>;
export type CombatTuningPreset = z.infer<typeof combatTuningPresetSchema>;
export type SavePolicyReason = z.infer<typeof savePolicyReasonSchema>;
export type SavePolicy = z.infer<typeof savePolicySchema>;
export type DebugFeatureFlags = z.infer<typeof debugFeatureFlagsSchema>;
export type GameShellUiSettings = z.infer<typeof gameShellUiSettingsSchema>;
export type ResourceKind = z.infer<typeof resourceKindSchema>;
export type ResourceDefinition = z.infer<typeof resourceDefinitionSchema>;
export type ResourceState = z.infer<typeof resourceStateSchema>;
