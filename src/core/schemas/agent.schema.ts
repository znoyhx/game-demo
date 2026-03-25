import { z } from 'zod';

import { areaSchema, interactionPointSchema } from './area.schema';
import {
  combatCommandActionSchema,
  combatEncounterDefinitionSchema,
  combatEnvironmentStateSchema,
  combatHistoryEntrySchema,
  combatStateSchema,
  enemyTacticTypeSchema,
} from './combat.schema';
import {
  eventLogEntrySchema,
  scheduledEventStateSchema,
  worldEventSchema,
} from './event.schema';
import {
  areaIdSchema,
  booleanFlagRecordSchema,
  eventIdSchema,
  genericIdSchema,
  itemIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  npcIdSchema,
  positiveIntegerSchema,
  questIdSchema,
} from './shared';
import { npcDefinitionSchema, npcDialogueTurnSchema, npcStateSchema } from './npc.schema';
import { playerModelStateSchema, playerProfileTagSchema, playerStateSchema } from './player.schema';
import { questDefinitionSchema, questProgressSchema } from './quest.schema';
import { reviewPayloadSchema } from './review.schema';
import { factionSchema, worldModeSchema, worldSchema } from './world.schema';

export const difficultyLevelSchema = z.enum(['easy', 'normal', 'hard']);

export const worldArchitectInputSchema = z
  .object({
    theme: nonEmptyStringSchema,
    worldStyle: nonEmptyStringSchema,
    preferredMode: worldModeSchema,
    difficulty: difficultyLevelSchema,
    gameGoal: nonEmptyStringSchema,
    learningGoal: nonEmptyStringSchema.optional(),
    quickStartEnabled: z.boolean(),
    devModeEnabled: z.boolean(),
    promptStyle: nonEmptyStringSchema.optional(),
  })
  .strict();

export const worldArchitectOutputSchema = z
  .object({
    world: worldSchema,
    areas: z.array(areaSchema),
    factions: z.array(factionSchema),
    storyPremise: nonEmptyStringSchema,
  })
  .strict();

export const questDesignerInputSchema = z
  .object({
    world: worldSchema,
    areas: z.array(areaSchema),
    npcDefinitions: z.array(npcDefinitionSchema),
    gameGoal: nonEmptyStringSchema,
    learningGoal: nonEmptyStringSchema.optional(),
    storyPremise: nonEmptyStringSchema,
    questCount: z
      .object({
        main: nonNegativeIntegerSchema,
        side: nonNegativeIntegerSchema,
      })
      .strict(),
  })
  .strict();

export const questDesignerOutputSchema = z
  .object({
    quests: z.array(questDefinitionSchema),
  })
  .strict();

export const levelBuilderInputSchema = z
  .object({
    area: areaSchema,
    world: worldSchema,
    questContext: z.array(questDefinitionSchema).optional(),
  })
  .strict();

export const levelBuilderOutputSchema = z
  .object({
    area: areaSchema,
    interactionPoints: z.array(interactionPointSchema),
  })
  .strict();

export const npcTradeTransferSchema = z
  .object({
    itemId: itemIdSchema,
    quantity: positiveIntegerSchema,
    direction: z.enum(['to-player', 'from-player']),
  })
  .strict();

export const npcRelationshipNetworkChangeSchema = z
  .object({
    targetNpcId: npcIdSchema,
    delta: z.number().min(-100).max(100),
    bond: nonEmptyStringSchema.optional(),
  })
  .strict();

export const npcBrainInputSchema = z
  .object({
    npcDefinition: npcDefinitionSchema,
    npcState: npcStateSchema,
    questDefinitions: z.array(questDefinitionSchema),
    questProgressEntries: z.array(questProgressSchema),
    playerState: playerStateSchema,
    playerModel: playerModelStateSchema,
    recentDialogue: z.array(npcDialogueTurnSchema),
  })
  .strict();

export const npcBrainOutputSchema = z
  .object({
    npcReply: nonEmptyStringSchema,
    trustDelta: z.number().min(-100).max(100).optional(),
    relationshipDelta: z.number().min(-100).max(100).optional(),
    memoryNote: nonEmptyStringSchema.optional(),
    longTermMemoryNote: nonEmptyStringSchema.optional(),
    questOfferIds: z.array(questIdSchema).default([]),
    itemTransfers: z.array(npcTradeTransferSchema).default([]),
    playerGoldDelta: z.number().int().default(0),
    relationshipNetworkChanges: z
      .array(npcRelationshipNetworkChangeSchema)
      .default([]),
    decisionBasis: z.array(nonEmptyStringSchema).default([]),
    explanationHint: nonEmptyStringSchema.optional(),
  })
  .strict();

export const enemyTacticianInputSchema = z
  .object({
    encounter: combatEncounterDefinitionSchema,
    combatState: combatStateSchema,
    playerState: playerStateSchema,
    playerTags: z.array(playerProfileTagSchema),
    commonPlayerActions: z.array(combatCommandActionSchema).default([]),
    environmentState: combatEnvironmentStateSchema.optional(),
    bossPhaseId: genericIdSchema.optional(),
  })
  .strict();

export const enemyTacticianOutputSchema = z
  .object({
    selectedTactic: enemyTacticTypeSchema,
    reason: nonEmptyStringSchema.optional(),
  })
  .strict();

export const gameMasterInputSchema = z
  .object({
    currentAreaId: areaIdSchema,
    activeQuestIds: z.array(questIdSchema),
    triggeredEvents: z.array(eventLogEntrySchema),
    playerTags: z.array(playerProfileTagSchema),
    worldFlags: booleanFlagRecordSchema,
    worldTension: nonNegativeIntegerSchema,
    timeOfDay: nonEmptyStringSchema.optional(),
    availableEvents: z.array(worldEventSchema),
    pendingEvents: z.array(scheduledEventStateSchema).default([]),
  })
  .strict();

export const gameMasterOutputSchema = z
  .object({
    eventToTrigger: eventIdSchema.optional(),
    scheduledEvents: z.array(scheduledEventStateSchema).default([]),
    pacingNote: nonEmptyStringSchema.optional(),
    worldTensionDelta: z.number().int().min(-100).max(100).optional(),
  })
  .strict();

export const playerModelInputSchema = z
  .object({
    recentAreaVisits: z.array(areaIdSchema),
    recentQuestChoices: z.array(nonEmptyStringSchema),
    combatSummary: combatStateSchema.nullable().optional(),
    npcInteractionCount: nonNegativeIntegerSchema,
  })
  .strict();

export const playerModelOutputSchema = z
  .object({
    tags: z.array(playerProfileTagSchema),
    rationale: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const explainCoachInputSchema = z
  .object({
    player: playerStateSchema,
    encounter: combatEncounterDefinitionSchema.nullable().optional(),
    combat: combatStateSchema.nullable().optional(),
    combatHistory: z.array(combatHistoryEntrySchema).default([]),
    questProgress: z.array(questProgressSchema),
    eventHistory: z.array(eventLogEntrySchema),
  })
  .strict();

export const explainCoachOutputSchema = z
  .object({
    review: reviewPayloadSchema,
  })
  .strict();

export const agentContractsSchema = z
  .object({
    worldArchitect: z
      .object({
        input: worldArchitectInputSchema,
        output: worldArchitectOutputSchema,
      })
      .strict(),
    questDesigner: z
      .object({
        input: questDesignerInputSchema,
        output: questDesignerOutputSchema,
      })
      .strict(),
    levelBuilder: z
      .object({
        input: levelBuilderInputSchema,
        output: levelBuilderOutputSchema,
      })
      .strict(),
    npcBrain: z
      .object({
        input: npcBrainInputSchema,
        output: npcBrainOutputSchema,
      })
      .strict(),
    enemyTactician: z
      .object({
        input: enemyTacticianInputSchema,
        output: enemyTacticianOutputSchema,
      })
      .strict(),
    gameMaster: z
      .object({
        input: gameMasterInputSchema,
        output: gameMasterOutputSchema,
      })
      .strict(),
    playerModel: z
      .object({
        input: playerModelInputSchema,
        output: playerModelOutputSchema,
      })
      .strict(),
    explainCoach: z
      .object({
        input: explainCoachInputSchema,
        output: explainCoachOutputSchema,
      })
      .strict(),
  })
  .strict();

export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;
export type WorldArchitectInput = z.infer<typeof worldArchitectInputSchema>;
export type WorldArchitectOutput = z.infer<typeof worldArchitectOutputSchema>;
export type QuestDesignerInput = z.infer<typeof questDesignerInputSchema>;
export type QuestDesignerOutput = z.infer<typeof questDesignerOutputSchema>;
export type LevelBuilderInput = z.infer<typeof levelBuilderInputSchema>;
export type LevelBuilderOutput = z.infer<typeof levelBuilderOutputSchema>;
export type NpcTradeTransfer = z.infer<typeof npcTradeTransferSchema>;
export type NpcRelationshipNetworkChange = z.infer<
  typeof npcRelationshipNetworkChangeSchema
>;
export type NpcBrainInput = z.infer<typeof npcBrainInputSchema>;
export type NpcBrainOutput = z.infer<typeof npcBrainOutputSchema>;
export type EnemyTacticianInput = z.infer<typeof enemyTacticianInputSchema>;
export type EnemyTacticianOutput = z.infer<typeof enemyTacticianOutputSchema>;
export type GameMasterInput = z.infer<typeof gameMasterInputSchema>;
export type GameMasterOutput = z.infer<typeof gameMasterOutputSchema>;
export type PlayerModelInput = z.infer<typeof playerModelInputSchema>;
export type PlayerModelOutput = z.infer<typeof playerModelOutputSchema>;
export type ExplainCoachInput = z.infer<typeof explainCoachInputSchema>;
export type ExplainCoachOutput = z.infer<typeof explainCoachOutputSchema>;
export type AgentContracts = z.infer<typeof agentContractsSchema>;
