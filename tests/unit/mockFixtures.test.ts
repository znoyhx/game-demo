import { describe, expect, it } from 'vitest';

import {
  areaSchema,
  combatEncounterDefinitionSchema,
  npcDefinitionSchema,
  npcStateSchema,
  questDefinitionSchema,
  questProgressSchema,
  saveSnapshotSchema,
  worldEventSchema,
  worldSchema,
} from '../../src/core/schemas';
import {
  mockAreas,
  mockBossEncounterDefinition,
  mockEventHistory,
  mockNpcDefinitions,
  mockNpcStates,
  mockPlayerState,
  mockQuestDefinitions,
  mockQuestProgress,
  mockSaveSnapshot,
  mockWorld,
  mockWorldEvents,
} from '../../src/core/mocks/mvp';

describe('mvp mock fixtures', () => {
  it('covers the required MVP fixture counts', () => {
    expect(mockAreas).toHaveLength(3);
    expect(mockNpcDefinitions).toHaveLength(5);
    expect(mockQuestDefinitions.filter((entry) => entry.type === 'main')).toHaveLength(1);
    expect(mockQuestDefinitions.filter((entry) => entry.type === 'side')).toHaveLength(3);
    expect(mockWorldEvents).toHaveLength(3);
  });

  it('validates every fixture against the runtime schemas', () => {
    expect(worldSchema.safeParse(mockWorld).success).toBe(true);
    expect(mockAreas.every((entry) => areaSchema.safeParse(entry).success)).toBe(true);
    expect(mockNpcDefinitions.every((entry) => npcDefinitionSchema.safeParse(entry).success)).toBe(true);
    expect(mockNpcStates.every((entry) => npcStateSchema.safeParse(entry).success)).toBe(true);
    expect(mockQuestDefinitions.every((entry) => questDefinitionSchema.safeParse(entry).success)).toBe(true);
    expect(mockQuestProgress.every((entry) => questProgressSchema.safeParse(entry).success)).toBe(true);
    expect(mockWorldEvents.every((entry) => worldEventSchema.safeParse(entry).success)).toBe(true);
    expect(combatEncounterDefinitionSchema.safeParse(mockBossEncounterDefinition).success).toBe(true);
    expect(saveSnapshotSchema.safeParse(mockSaveSnapshot).success).toBe(true);
  });

  it('keeps the save and definition fixtures internally consistent', () => {
    const areaIds = new Set(mockAreas.map((entry) => entry.id));
    const npcIds = new Set(mockNpcDefinitions.map((entry) => entry.id));
    const questIds = new Set(mockQuestDefinitions.map((entry) => entry.id));
    const eventIds = new Set(mockWorldEvents.map((entry) => entry.id));

    expect(new Set(mockWorld.areaIds)).toEqual(areaIds);
    expect(areaIds.has(mockPlayerState.currentAreaId)).toBe(true);
    expect(mockAreas.flatMap((entry) => entry.npcIds).every((npcId) => npcIds.has(npcId))).toBe(true);
    expect(mockAreas.flatMap((entry) => entry.eventIds).every((eventId) => eventIds.has(eventId))).toBe(true);
    expect(mockQuestDefinitions.every((entry) => !entry.giverNpcId || npcIds.has(entry.giverNpcId))).toBe(true);
    expect(mockQuestProgress.every((entry) => questIds.has(entry.questId))).toBe(true);
    expect(mockEventHistory.every((entry) => eventIds.has(entry.eventId))).toBe(true);
    expect(areaIds.has(mockBossEncounterDefinition.areaId)).toBe(true);
    expect(npcIds.has(mockBossEncounterDefinition.enemyNpcId ?? '')).toBe(true);
    expect(mockSaveSnapshot.areas).toHaveLength(mockAreas.length);
    expect(mockSaveSnapshot.npcs.definitions).toHaveLength(mockNpcDefinitions.length);
    expect(mockSaveSnapshot.quests.definitions).toHaveLength(mockQuestDefinitions.length);
  });
});
