import { z } from 'zod';

import { playerProfileTagSchema } from './player.schema';
import {
  genericIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  questIdSchema,
} from './shared';
import {
  questConditionTypeSchema,
  questHistoryEntrySchema,
  questStatusSchema,
  questTypeSchema,
} from './quest.schema';

export const questDebugConditionCategorySchema = z.enum([
  'trigger',
  'completion',
  'failure',
]);

export const questDebugConditionSummarySchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    type: questConditionTypeSchema,
    category: questDebugConditionCategorySchema,
    targetId: nonEmptyStringSchema.optional(),
    requiredStatus: questStatusSchema.optional(),
    requiredCount: positiveIntegerSchema.optional(),
    minTrust: nonNegativeIntegerSchema.optional(),
    playerTag: playerProfileTagSchema.optional(),
    satisfied: z.boolean(),
    current: z.boolean(),
  })
  .strict();

export const questDebugBranchSummarySchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    selected: z.boolean(),
  })
  .strict();

export const questDebugQuestSummarySchema = z
  .object({
    questId: questIdSchema,
    title: nonEmptyStringSchema,
    type: questTypeSchema,
    status: questStatusSchema,
    currentObjectiveIndex: nonNegativeIntegerSchema,
    currentConditionId: genericIdSchema.optional(),
    completedObjectiveIds: z.array(genericIdSchema),
    chosenBranchId: genericIdSchema.optional(),
    canReset: z.boolean(),
    dependencyQuestIds: z.array(questIdSchema),
    dependentQuestIds: z.array(questIdSchema),
    triggerConditions: z.array(questDebugConditionSummarySchema),
    completionConditions: z.array(questDebugConditionSummarySchema),
    failureConditions: z.array(questDebugConditionSummarySchema),
    branches: z.array(questDebugBranchSummarySchema),
    logCount: nonNegativeIntegerSchema,
  })
  .strict();

export const questDebugDependencyGraphNodeSchema = z
  .object({
    questId: questIdSchema,
    title: nonEmptyStringSchema,
    type: questTypeSchema,
    status: questStatusSchema,
    dependsOn: z.array(questIdSchema),
    requiredBy: z.array(questIdSchema),
  })
  .strict();

export const questDebugSnapshotSchema = z
  .object({
    quests: z.array(questDebugQuestSummarySchema),
    dependencyGraph: z.array(questDebugDependencyGraphNodeSchema),
    logs: z.array(questHistoryEntrySchema),
  })
  .strict();

export const questDebugConditionSimulationSchema = z
  .object({
    questId: questIdSchema,
    conditionId: genericIdSchema,
    note: nonEmptyStringSchema.optional(),
    count: positiveIntegerSchema.optional(),
  })
  .strict();

export const questDebugStageInjectionSchema = z
  .object({
    questId: questIdSchema,
    stageIndex: nonNegativeIntegerSchema,
    chosenBranchId: genericIdSchema.optional(),
  })
  .strict();

export type QuestDebugConditionCategory = z.infer<
  typeof questDebugConditionCategorySchema
>;
export type QuestDebugConditionSummary = z.infer<
  typeof questDebugConditionSummarySchema
>;
export type QuestDebugBranchSummary = z.infer<
  typeof questDebugBranchSummarySchema
>;
export type QuestDebugQuestSummary = z.infer<
  typeof questDebugQuestSummarySchema
>;
export type QuestDebugDependencyGraphNode = z.infer<
  typeof questDebugDependencyGraphNodeSchema
>;
export type QuestDebugSnapshot = z.infer<typeof questDebugSnapshotSchema>;
export type QuestDebugConditionSimulationRequest = z.infer<
  typeof questDebugConditionSimulationSchema
>;
export type QuestDebugStageInjectionRequest = z.infer<
  typeof questDebugStageInjectionSchema
>;
