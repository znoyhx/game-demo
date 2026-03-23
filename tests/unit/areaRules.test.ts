import { describe, expect, it } from 'vitest';

import { mockAreas, mockIds, mockNpcStates, mockQuestProgress, mockWorld } from '../../src/core/mocks';
import { evaluateAreaAccess } from '../../src/core/rules';

describe('area rules', () => {
  it('blocks access when unlock conditions are not yet satisfied', () => {
    const currentArea = mockAreas.find((area) => area.id === mockIds.areas.archive)!;
    const targetArea = mockAreas.find((area) => area.id === mockIds.areas.sanctum)!;

    const result = evaluateAreaAccess({
      currentArea,
      targetArea,
      unlockedAreaIds: [mockIds.areas.crossroads, mockIds.areas.archive],
      questProgress: mockQuestProgress,
      worldFlags: mockWorld.flags,
      npcStatesById: Object.fromEntries(
        mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
      ),
    });

    expect(result.ok).toBe(false);
    expect(result.reasons.some((reason) => reason.includes('sanctumSealBroken'))).toBe(true);
  });

  it('allows access once unlock conditions are satisfied', () => {
    const currentArea = mockAreas.find((area) => area.id === mockIds.areas.archive)!;
    const targetArea = mockAreas.find((area) => area.id === mockIds.areas.sanctum)!;

    const result = evaluateAreaAccess({
      currentArea,
      targetArea,
      unlockedAreaIds: [mockIds.areas.crossroads, mockIds.areas.archive],
      questProgress: mockQuestProgress,
      worldFlags: {
        ...mockWorld.flags,
        sanctumSealBroken: true,
      },
      npcStatesById: Object.fromEntries(
        mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
      ),
    });

    expect(result.ok).toBe(true);
    expect(result.shouldUnlock).toBe(true);
  });
});
