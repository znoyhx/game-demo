import { describe, expect, it } from 'vitest';

import {
  mockAreas,
  mockEventDirectorState,
  mockEventHistory,
  mockIds,
  mockNpcDefinitions,
  mockNpcStates,
  mockQuestProgress,
  mockWorld,
  mockWorldEvents,
} from '../../src/core/mocks';
import { applyEventEffects, evaluateEventTrigger } from '../../src/core/rules';

const npcStatesById = Object.fromEntries(
  mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
);

describe('event rules', () => {
  it('blocks non-repeatable events that already exist in history', () => {
    const event = mockWorldEvents.find((entry) => entry.id === mockIds.events.ashfallWarning)!;

    const result = evaluateEventTrigger(event, {
      currentAreaId: mockIds.areas.crossroads,
      questProgressEntries: mockQuestProgress,
      playerTags: ['exploration'],
      worldFlags: mockWorld.flags,
      eventHistory: mockEventHistory,
      npcStatesById,
      worldTimeOfDay: mockWorld.timeOfDay,
      worldTension: 32,
    });

    expect(result.ok).toBe(false);
  });

  it('supports time and balance triggers for resource pressure events', () => {
    const event = mockWorldEvents.find(
      (entry) => entry.id === mockIds.events.supplyShortfall,
    )!;

    const result = evaluateEventTrigger(event, {
      currentAreaId: mockIds.areas.crossroads,
      questProgressEntries: mockQuestProgress,
      playerTags: ['exploration'],
      worldFlags: mockWorld.flags,
      eventHistory: [],
      npcStatesById,
      worldTimeOfDay: '暮色将尽',
      worldTension: 48,
    });

    expect(result.ok).toBe(true);
  });

  it('supports relationship-based triggers for NPC movement events', () => {
    const event = mockWorldEvents.find(
      (entry) => entry.id === mockIds.events.patrolRedeployment,
    )!;

    const progress = mockQuestProgress.map((entry) =>
      entry.questId === mockIds.quests.sidePatrol
        ? {
            ...entry,
            status: 'active' as const,
          }
        : entry,
    );

    const result = evaluateEventTrigger(event, {
      currentAreaId: mockIds.areas.archive,
      questProgressEntries: progress,
      playerTags: ['story'],
      worldFlags: mockWorld.flags,
      eventHistory: [],
      npcStatesById,
      worldTimeOfDay: mockWorld.timeOfDay,
      worldTension: 52,
    });

    expect(result.ok).toBe(true);
  });

  it('allows the sanctum countermeasure when the player is risky in the sanctum', () => {
    const event = mockWorldEvents.find(
      (entry) => entry.id === mockIds.events.wardenCountermeasure,
    )!;

    const result = evaluateEventTrigger(event, {
      currentAreaId: mockIds.areas.sanctum,
      questProgressEntries: mockQuestProgress,
      playerTags: ['risky'],
      worldFlags: mockWorld.flags,
      eventHistory: mockEventHistory,
      npcStatesById,
      worldTimeOfDay: mockWorld.timeOfDay,
      worldTension: 68,
    });

    expect(result.ok).toBe(true);
  });

  it('applies resource, clue, shop, conflict, and NPC movement effects deterministically', () => {
    const combinedEffects = {
      ...mockWorldEvents.find((entry) => entry.id === mockIds.events.supplyShortfall)!.effects,
      moveNpcs:
        mockWorldEvents.find((entry) => entry.id === mockIds.events.patrolRedeployment)!.effects
          .moveNpcs,
      revealClues:
        mockWorldEvents.find((entry) => entry.id === mockIds.events.archiveEchoes)!.effects
          .revealClues,
      setShopPriceModifiers:
        mockWorldEvents.find((entry) => entry.id === mockIds.events.marketPanic)!.effects
          .setShopPriceModifiers,
      registerFactionConflicts:
        mockWorldEvents.find((entry) => entry.id === mockIds.events.borderSkirmish)!.effects
          .registerFactionConflicts,
      bossAppearances:
        mockWorldEvents.find((entry) => entry.id === mockIds.events.earlyBossSighted)!.effects
          .bossAppearances,
    };

    const result = applyEventEffects(mockIds.events.borderSkirmish, combinedEffects, {
      areas: mockAreas,
      factions: mockWorld.factions,
      npcDefinitions: mockNpcDefinitions,
      eventDirector: mockEventDirectorState,
      timestamp: '2026-03-25T11:00:00.000Z',
    });

    const crossroads = result.areas.find((area) => area.id === mockIds.areas.crossroads)!;
    const archive = result.areas.find((area) => area.id === mockIds.areas.archive)!;
    const rowanDefinition = result.npcDefinitions.find(
      (definition) => definition.id === mockIds.npcs.rowan,
    )!;
    const ashWardenDefinition = result.npcDefinitions.find(
      (definition) => definition.id === mockIds.npcs.ashWarden,
    )!;

    expect(
      crossroads.resourceNodes.find(
        (resourceNode) => resourceNode.id === 'resource-node:crossroads-supply-cache',
      )?.quantity,
    ).toBe(1);
    expect(rowanDefinition.areaId).toBe(mockIds.areas.crossroads);
    expect(archive.npcIds).toContain(mockIds.npcs.ashWarden);
    expect(ashWardenDefinition.areaId).toBe(mockIds.areas.archive);
    expect(result.revealedClues.some((clue) => clue.clueId === 'clue:forbidden-chant')).toBe(
      true,
    );
    expect(
      result.shopPriceModifiers.find((modifier) => modifier.npcId === mockIds.npcs.brom)
        ?.multiplier,
    ).toBe(1.25);
    expect(
      result.factionConflicts.find(
        (conflict) => conflict.conflictId === 'conflict:archive-borderline',
      )?.intensity,
    ).toBe(72);
  });
});
