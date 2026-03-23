import { describe, expect, it } from 'vitest';

import {
  mockEventHistory,
  mockIds,
  mockNpcStates,
  mockQuestProgress,
  mockWorld,
  mockWorldEvents,
} from '../../src/core/mocks';
import { applyEventEffects, evaluateEventTrigger } from '../../src/core/rules';

describe('event rules', () => {
  it('blocks non-repeatable events that already exist in history', () => {
    const event = mockWorldEvents.find((entry) => entry.id === mockIds.events.ashfallWarning)!;

    const result = evaluateEventTrigger(event, {
      currentAreaId: mockIds.areas.crossroads,
      questProgressEntries: mockQuestProgress,
      playerTags: ['exploration'],
      worldFlags: mockWorld.flags,
      eventHistory: mockEventHistory,
      npcStatesById: Object.fromEntries(
        mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
      ),
    });

    expect(result.ok).toBe(false);
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
      npcStatesById: Object.fromEntries(
        mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
      ),
    });

    expect(result.ok).toBe(true);
    expect(applyEventEffects(event.effects).worldFlagsToSet).toContain('wardenAlertRaised');
  });
});
