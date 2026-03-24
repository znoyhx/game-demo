import { z } from 'zod';

import { playerProfileTagSchema } from './player.schema';
import {
  areaIdSchema,
  genericIdSchema,
  isoTimestampSchema,
  itemIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  npcIdSchema,
  positiveIntegerSchema,
  questIdSchema,
} from './shared';

export const questTypeSchema = z.enum(['main', 'side', 'hidden', 'tutorial', 'dynamic']);
export const questStatusSchema = z.enum(['locked', 'available', 'active', 'completed', 'failed']);
export const questObjectiveTypeSchema = z.enum(['talk', 'visit', 'collect', 'battle', 'trigger']);
export const questConditionTypeSchema = z.enum([
  'talk',
  'visit',
  'collect',
  'battle',
  'trigger',
  'quest-status',
  'world-flag',
  'npc-trust',
  'player-tag',
  'event',
  'current-area',
  'visited-area',
]);

export const questRewardSchema = z
  .object({
    exp: nonNegativeIntegerSchema.optional(),
    gold: nonNegativeIntegerSchema.optional(),
    items: z.array(itemIdSchema).optional(),
    unlockAreaIds: z.array(areaIdSchema).optional(),
    worldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const questConditionSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    type: questConditionTypeSchema,
    targetId: nonEmptyStringSchema.optional(),
    requiredStatus: questStatusSchema.optional(),
    requiredCount: positiveIntegerSchema.optional(),
    minTrust: nonNegativeIntegerSchema.optional(),
    playerTag: playerProfileTagSchema.optional(),
  })
  .strict();

export const questDependencySchema = z
  .object({
    questId: questIdSchema,
    requiredStatus: questStatusSchema.default('completed'),
  })
  .strict();

export const questBranchResultSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    activationConditions: z.array(questConditionSchema).default([]),
    reward: questRewardSchema.optional(),
    setsWorldFlags: z.array(nonEmptyStringSchema).optional(),
    changesNpcRelation: z
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

export const questObjectiveSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    type: questObjectiveTypeSchema,
    targetId: nonEmptyStringSchema.optional(),
    requiredCount: positiveIntegerSchema.optional(),
  })
  .strict();

export const questUnlockConditionSchema = z
  .object({
    requiredQuestIds: z.array(questIdSchema).optional(),
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const questDefinitionSchema = z
  .object({
    id: questIdSchema,
    type: questTypeSchema,
    title: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    giverNpcId: npcIdSchema.optional(),
    triggerConditions: z.array(questConditionSchema).default([]),
    completionConditions: z.array(questConditionSchema).default([]),
    failureConditions: z.array(questConditionSchema).default([]),
    dependencies: z.array(questDependencySchema).default([]),
    unlockCondition: questUnlockConditionSchema.optional(),
    objectives: z.array(questObjectiveSchema).optional(),
    reward: questRewardSchema.optional(),
    failureCondition: nonEmptyStringSchema.optional(),
    branchResults: z.array(questBranchResultSchema).default([]),
  })
  .strict();

export const questProgressSchema = z
  .object({
    questId: questIdSchema,
    status: questStatusSchema,
    currentObjectiveIndex: nonNegativeIntegerSchema,
    completedObjectiveIds: z.array(genericIdSchema),
    chosenBranchId: genericIdSchema.optional(),
    updatedAt: isoTimestampSchema,
  })
  .strict();

export const questHistoryEntrySchema = z
  .object({
    questId: questIdSchema,
    status: questStatusSchema,
    note: nonEmptyStringSchema,
    conditionId: genericIdSchema.optional(),
    branchId: genericIdSchema.optional(),
    updatedAt: isoTimestampSchema,
  })
  .strict();

export type QuestType = z.infer<typeof questTypeSchema>;
export type QuestStatus = z.infer<typeof questStatusSchema>;
export type QuestObjectiveType = z.infer<typeof questObjectiveTypeSchema>;
export type QuestConditionType = z.infer<typeof questConditionTypeSchema>;
export type QuestReward = z.infer<typeof questRewardSchema>;
export type QuestCondition = z.infer<typeof questConditionSchema>;
export type QuestDependency = z.infer<typeof questDependencySchema>;
export type QuestBranchResult = z.infer<typeof questBranchResultSchema>;
export type QuestObjective = z.infer<typeof questObjectiveSchema>;
export type QuestUnlockCondition = z.infer<typeof questUnlockConditionSchema>;
export type QuestDefinition = z.infer<typeof questDefinitionSchema>;
export type QuestProgress = z.infer<typeof questProgressSchema>;
export type QuestHistoryEntry = z.infer<typeof questHistoryEntrySchema>;
