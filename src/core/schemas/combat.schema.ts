import { z } from 'zod';

import {
  areaIdSchema,
  encounterIdSchema,
  genericIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  npcIdSchema,
  positiveIntegerSchema,
} from './shared';

export const combatModeSchema = z.enum(['turn-based', 'semi-realtime']);
export const combatCommandActionSchema = z.enum([
  'attack',
  'guard',
  'heal',
  'analyze',
  'special',
  'retreat',
]);
export const enemyTacticTypeSchema = z.enum([
  'aggressive',
  'defensive',
  'counter',
  'trap',
  'summon',
  'resource-lock',
]);
export const combatDebugPlayerPatternSchema = z.enum([
  'direct-pressure',
  'guard-cycle',
  'resource-burst',
  'analysis-first',
]);
export const combatEnvironmentHazardSchema = z.enum([
  'stable',
  'tense',
  'volatile',
]);
export const combatEnvironmentStateSchema = z
  .object({
    areaId: areaIdSchema,
    label: nonEmptyStringSchema,
    hazard: combatEnvironmentHazardSchema,
    weather: nonEmptyStringSchema.optional(),
    lighting: nonEmptyStringSchema.optional(),
  })
  .strict();

export const combatantSnapshotSchema = z
  .object({
    id: genericIdSchema,
    name: nonEmptyStringSchema,
    hp: nonNegativeIntegerSchema,
    maxHp: positiveIntegerSchema,
    statusEffects: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const bossPhaseThresholdTypeSchema = z.enum(['hp', 'turn']);

export const bossPhaseSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    thresholdType: bossPhaseThresholdTypeSchema,
    thresholdValue: positiveIntegerSchema,
    tacticBias: z.array(enemyTacticTypeSchema).optional(),
  })
  .strict();

export const combatEncounterDefinitionSchema = z
  .object({
    id: encounterIdSchema,
    title: nonEmptyStringSchema,
    mode: combatModeSchema,
    areaId: areaIdSchema,
    enemyNpcId: npcIdSchema.optional(),
    tacticPool: z.array(enemyTacticTypeSchema).min(1),
    bossPhases: z.array(bossPhaseSchema).optional(),
  })
  .strict();

export const combatActorSchema = z.enum(['player', 'enemy', 'system']);
export const combatResultSchema = z.enum(['victory', 'defeat', 'escape']);

export const combatTurnActionSchema = z
  .object({
    actor: combatActorSchema,
    actionType: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    value: z.number().finite().optional(),
  })
  .strict();

export const combatLogEntrySchema = z
  .object({
    turn: positiveIntegerSchema,
    phaseId: genericIdSchema.optional(),
    activeTactic: enemyTacticTypeSchema.optional(),
    actions: z.array(combatTurnActionSchema),
  })
  .strict();

export const combatTacticChangeSchema = z
  .object({
    turn: positiveIntegerSchema,
    fromTactic: enemyTacticTypeSchema.optional(),
    toTactic: enemyTacticTypeSchema,
    phaseId: genericIdSchema.optional(),
    summary: nonEmptyStringSchema,
  })
  .strict();

export const combatPhaseChangeSchema = z
  .object({
    turn: positiveIntegerSchema,
    fromPhaseId: genericIdSchema.optional(),
    toPhaseId: genericIdSchema,
    summary: nonEmptyStringSchema,
  })
  .strict();

export const combatPlayerBehaviorSummarySchema = z
  .object({
    actionType: combatCommandActionSchema,
    count: positiveIntegerSchema,
    summary: nonEmptyStringSchema,
  })
  .strict();

export const combatStateSchema = z
  .object({
    encounterId: encounterIdSchema,
    turn: positiveIntegerSchema,
    currentPhaseId: genericIdSchema.optional(),
    activeTactic: enemyTacticTypeSchema,
    player: combatantSnapshotSchema,
    enemy: combatantSnapshotSchema,
    logs: z.array(combatLogEntrySchema),
    result: combatResultSchema.optional(),
  })
  .strict();

export const combatHistoryEntrySchema = z
  .object({
    encounterId: encounterIdSchema,
    result: combatResultSchema,
    finalTactic: enemyTacticTypeSchema,
    resolvedAt: isoTimestampSchema,
    turnCount: positiveIntegerSchema,
    finalPhaseId: genericIdSchema.optional(),
    tacticChanges: z.array(combatTacticChangeSchema),
    phaseChanges: z.array(combatPhaseChangeSchema),
    keyPlayerBehaviors: z.array(combatPlayerBehaviorSummarySchema),
  })
  .strict();

export type CombatMode = z.infer<typeof combatModeSchema>;
export type CombatCommandAction = z.infer<typeof combatCommandActionSchema>;
export type EnemyTacticType = z.infer<typeof enemyTacticTypeSchema>;
export type CombatDebugPlayerPattern = z.infer<
  typeof combatDebugPlayerPatternSchema
>;
export type CombatEnvironmentHazard = z.infer<
  typeof combatEnvironmentHazardSchema
>;
export type CombatEnvironmentState = z.infer<
  typeof combatEnvironmentStateSchema
>;
export type CombatantSnapshot = z.infer<typeof combatantSnapshotSchema>;
export type BossPhaseThresholdType = z.infer<typeof bossPhaseThresholdTypeSchema>;
export type BossPhase = z.infer<typeof bossPhaseSchema>;
export type CombatEncounterDefinition = z.infer<typeof combatEncounterDefinitionSchema>;
export type CombatActor = z.infer<typeof combatActorSchema>;
export type CombatResult = z.infer<typeof combatResultSchema>;
export type CombatTurnAction = z.infer<typeof combatTurnActionSchema>;
export type CombatLogEntry = z.infer<typeof combatLogEntrySchema>;
export type CombatTacticChange = z.infer<typeof combatTacticChangeSchema>;
export type CombatPhaseChange = z.infer<typeof combatPhaseChangeSchema>;
export type CombatPlayerBehaviorSummary = z.infer<
  typeof combatPlayerBehaviorSummarySchema
>;
export type CombatState = z.infer<typeof combatStateSchema>;
export type CombatHistoryEntry = z.infer<typeof combatHistoryEntrySchema>;
