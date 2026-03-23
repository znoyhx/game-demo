import { z } from 'zod';

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

export const questRewardSchema = z
  .object({
    exp: nonNegativeIntegerSchema.optional(),
    gold: nonNegativeIntegerSchema.optional(),
    items: z.array(itemIdSchema).optional(),
    unlockAreaIds: z.array(areaIdSchema).optional(),
    worldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const questBranchResultSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
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
    unlockCondition: questUnlockConditionSchema.optional(),
    objectives: z.array(questObjectiveSchema),
    reward: questRewardSchema.optional(),
    failureCondition: nonEmptyStringSchema.optional(),
    branchResults: z.array(questBranchResultSchema).optional(),
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
    updatedAt: isoTimestampSchema,
  })
  .strict();

export type QuestType = z.infer<typeof questTypeSchema>;
export type QuestStatus = z.infer<typeof questStatusSchema>;
export type QuestObjectiveType = z.infer<typeof questObjectiveTypeSchema>;
export type QuestReward = z.infer<typeof questRewardSchema>;
export type QuestBranchResult = z.infer<typeof questBranchResultSchema>;
export type QuestObjective = z.infer<typeof questObjectiveSchema>;
export type QuestUnlockCondition = z.infer<typeof questUnlockConditionSchema>;
export type QuestDefinition = z.infer<typeof questDefinitionSchema>;
export type QuestProgress = z.infer<typeof questProgressSchema>;
export type QuestHistoryEntry = z.infer<typeof questHistoryEntrySchema>;
