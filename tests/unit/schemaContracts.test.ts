import type { ZodTypeAny } from 'zod';
import { describe, expect, it } from 'vitest';

import {
  areaSchema,
  combatEncounterDefinitionSchema,
  combatStateSchema,
  gameConfigStateSchema,
  enemyTacticianInputSchema,
  enemyTacticianOutputSchema,
  eventLogEntrySchema,
  explainCoachInputSchema,
  explainCoachOutputSchema,
  gameMasterInputSchema,
  gameMasterOutputSchema,
  levelBuilderInputSchema,
  levelBuilderOutputSchema,
  mapStateSchema,
  npcBrainInputSchema,
  npcBrainOutputSchema,
  npcDefinitionSchema,
  npcStateSchema,
  playerModelInputSchema,
  playerModelOutputSchema,
  playerModelStateSchema,
  playerStateSchema,
  questDefinitionSchema,
  questDesignerInputSchema,
  questDesignerOutputSchema,
  questProgressSchema,
  resourceStateSchema,
  reviewPayloadSchema,
  reviewStateSchema,
  saveSnapshotSchema,
  schemaRegistry,
  sessionSnapshotSchema,
  worldArchitectInputSchema,
  worldArchitectOutputSchema,
  worldEventSchema,
  worldSchema,
} from '../../src/core/schemas';
import {
  sampleArea,
  sampleGameConfigState,
  sampleCombatEncounterDefinition,
  sampleCombatState,
  sampleEnemyTacticianInput,
  sampleEnemyTacticianOutput,
  sampleEventLogEntry,
  sampleExplainCoachInput,
  sampleExplainCoachOutput,
  sampleGameMasterInput,
  sampleGameMasterOutput,
  sampleLevelBuilderInput,
  sampleLevelBuilderOutput,
  sampleMapState,
  sampleNpcBrainInput,
  sampleNpcBrainOutput,
  sampleNpcDefinition,
  sampleNpcState,
  samplePlayerModelInput,
  samplePlayerModelOutput,
  samplePlayerModelState,
  samplePlayerState,
  sampleQuestDefinition,
  sampleQuestDesignerInput,
  sampleQuestDesignerOutput,
  sampleQuestProgress,
  sampleResourceState,
  sampleReviewPayload,
  sampleReviewState,
  sampleSaveSnapshot,
  sampleSessionSnapshot,
  sampleWorld,
  sampleWorldArchitectInput,
  sampleWorldArchitectOutput,
  sampleWorldEvent,
} from '../fixtures/schemaFixtures';

const assertValid = (label: string, schema: ZodTypeAny, fixture: unknown) => {
  const result = schema.safeParse(fixture);

  if (!result.success) {
    throw new Error(`${label} fixture failed validation: ${result.error.message}`);
  }
};

describe('schema contracts', () => {
  it('registers all concrete schema modules as ready', () => {
    expect(schemaRegistry.map((entry) => entry.owner)).toEqual([
      'world',
      'area',
      'quest',
      'npc',
      'player',
      'config',
      'creation',
      'event',
      'combat',
      'review',
      'save',
      'session',
      'agent',
    ]);

    expect(schemaRegistry.every((entry) => entry.status === 'ready')).toBe(true);
  });

  it('validates representative core domain fixtures', () => {
    const fixtures: Array<{ label: string; schema: ZodTypeAny; fixture: unknown }> = [
      { label: 'world', schema: worldSchema, fixture: sampleWorld },
      { label: 'area', schema: areaSchema, fixture: sampleArea },
      { label: 'map state', schema: mapStateSchema, fixture: sampleMapState },
      { label: 'quest definition', schema: questDefinitionSchema, fixture: sampleQuestDefinition },
      { label: 'quest progress', schema: questProgressSchema, fixture: sampleQuestProgress },
      { label: 'npc definition', schema: npcDefinitionSchema, fixture: sampleNpcDefinition },
      { label: 'npc state', schema: npcStateSchema, fixture: sampleNpcState },
      { label: 'player state', schema: playerStateSchema, fixture: samplePlayerState },
      {
        label: 'player model state',
        schema: playerModelStateSchema,
        fixture: samplePlayerModelState,
      },
      { label: 'world event', schema: worldEventSchema, fixture: sampleWorldEvent },
      { label: 'event log entry', schema: eventLogEntrySchema, fixture: sampleEventLogEntry },
      {
        label: 'combat encounter definition',
        schema: combatEncounterDefinitionSchema,
        fixture: sampleCombatEncounterDefinition,
      },
      { label: 'combat state', schema: combatStateSchema, fixture: sampleCombatState },
      { label: 'game config', schema: gameConfigStateSchema, fixture: sampleGameConfigState },
      { label: 'resource state', schema: resourceStateSchema, fixture: sampleResourceState },
      { label: 'review payload', schema: reviewPayloadSchema, fixture: sampleReviewPayload },
      { label: 'review state', schema: reviewStateSchema, fixture: sampleReviewState },
      { label: 'save snapshot', schema: saveSnapshotSchema, fixture: sampleSaveSnapshot },
      { label: 'session snapshot', schema: sessionSnapshotSchema, fixture: sampleSessionSnapshot },
    ];

    fixtures.forEach(({ label, schema, fixture }) => {
      assertValid(label, schema, fixture);
    });
  });

  it('validates representative agent payload fixtures', () => {
    const fixtures: Array<{ label: string; schema: ZodTypeAny; fixture: unknown }> = [
      { label: 'world architect input', schema: worldArchitectInputSchema, fixture: sampleWorldArchitectInput },
      { label: 'world architect output', schema: worldArchitectOutputSchema, fixture: sampleWorldArchitectOutput },
      { label: 'quest designer input', schema: questDesignerInputSchema, fixture: sampleQuestDesignerInput },
      { label: 'quest designer output', schema: questDesignerOutputSchema, fixture: sampleQuestDesignerOutput },
      { label: 'level builder input', schema: levelBuilderInputSchema, fixture: sampleLevelBuilderInput },
      { label: 'level builder output', schema: levelBuilderOutputSchema, fixture: sampleLevelBuilderOutput },
      { label: 'npc brain input', schema: npcBrainInputSchema, fixture: sampleNpcBrainInput },
      { label: 'npc brain output', schema: npcBrainOutputSchema, fixture: sampleNpcBrainOutput },
      { label: 'enemy tactician input', schema: enemyTacticianInputSchema, fixture: sampleEnemyTacticianInput },
      {
        label: 'enemy tactician output',
        schema: enemyTacticianOutputSchema,
        fixture: sampleEnemyTacticianOutput,
      },
      { label: 'game master input', schema: gameMasterInputSchema, fixture: sampleGameMasterInput },
      { label: 'game master output', schema: gameMasterOutputSchema, fixture: sampleGameMasterOutput },
      { label: 'player model input', schema: playerModelInputSchema, fixture: samplePlayerModelInput },
      { label: 'player model output', schema: playerModelOutputSchema, fixture: samplePlayerModelOutput },
      { label: 'explain coach input', schema: explainCoachInputSchema, fixture: sampleExplainCoachInput },
      { label: 'explain coach output', schema: explainCoachOutputSchema, fixture: sampleExplainCoachOutput },
    ];

    fixtures.forEach(({ label, schema, fixture }) => {
      assertValid(label, schema, fixture);
    });
  });
});
