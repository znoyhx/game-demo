import { z } from 'zod';

import { areaSchema, interactionPointSchema } from './area.schema';
import { combatEncounterDefinitionSchema, combatStateSchema, enemyTacticTypeSchema } from './combat.schema';
import { eventLogEntrySchema } from './event.schema';
import {
  areaIdSchema,
  eventIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  questIdSchema,
} from './shared';
import { npcDefinitionSchema, npcDialogueTurnSchema, npcDispositionSchema, npcStateSchema } from './npc.schema';
import { playerProfileTagSchema, playerStateSchema } from './player.schema';
import { questDefinitionSchema, questProgressSchema } from './quest.schema';
import { reviewPayloadSchema } from './review.schema';
import { factionSchema, worldModeSchema, worldSchema } from './world.schema';

export const difficultyLevelSchema = z.enum(['easy', 'normal', 'hard']);

export const worldArchitectInputSchema = z
  .object({
    theme: nonEmptyStringSchema,
    preferredMode: worldModeSchema,
    difficulty: difficultyLevelSchema,
    promptStyle: nonEmptyStringSchema.optional(),
  })
  .strict();

export const worldArchitectOutputSchema = z
  .object({
    world: worldSchema,
    areas: z.array(areaSchema),
    factions: z.array(factionSchema),
  })
  .strict();

export const questDesignerInputSchema = z
  .object({
    world: worldSchema,
    areas: z.array(areaSchema),
    npcDefinitions: z.array(npcDefinitionSchema),
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

export const npcBrainInputSchema = z
  .object({
    npcDefinition: npcDefinitionSchema,
    npcState: npcStateSchema,
    activeQuests: z.array(questProgressSchema),
    playerState: playerStateSchema,
    recentDialogue: z.array(npcDialogueTurnSchema),
  })
  .strict();

export const npcBrainOutputSchema = z
  .object({
    npcReply: nonEmptyStringSchema,
    updatedDisposition: npcDispositionSchema.optional(),
    trustDelta: z.number().min(-100).max(100).optional(),
    relationshipDelta: z.number().min(-100).max(100).optional(),
    unlockedQuestIds: z.array(questIdSchema).optional(),
    explanationHint: nonEmptyStringSchema.optional(),
  })
  .strict();

export const enemyTacticianInputSchema = z
  .object({
    encounter: combatEncounterDefinitionSchema,
    combatState: combatStateSchema,
    playerTags: z.array(playerProfileTagSchema),
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
  })
  .strict();

export const gameMasterOutputSchema = z
  .object({
    eventToTrigger: eventIdSchema.optional(),
    pacingNote: nonEmptyStringSchema.optional(),
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
    combat: combatStateSchema.nullable().optional(),
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
