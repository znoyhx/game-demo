import { describe, expect, it } from 'vitest';

import {
  mockAreas,
  mockIds,
  mockNpcStates,
  mockQuestProgress,
  mockWorld,
} from '../../src/core/mocks';
import {
  buildAreaEnvironmentDebugMutation,
  evaluateAreaAccess,
  isAreaVisibleInNavigation,
  resolveAreaEnvironmentState,
} from '../../src/core/rules';

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

  it('blocks access when the target area is not connected to the current route', () => {
    const currentArea = mockAreas.find((area) => area.id === mockIds.areas.crossroads)!;
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
    expect(result.reasons[0]).toContain('并不连通');
  });

  it('resolves environment state from world flags', () => {
    const archive = mockAreas.find((area) => area.id === mockIds.areas.archive)!;

    const resolved = resolveAreaEnvironmentState(archive, mockWorld.flags);

    expect(resolved.id).toBe('env:archive-resonant');
    expect(resolved.hazard).toBe('tense');
  });

  it('prefers the most specific activated environment state when multiple states match', () => {
    const sanctum = mockAreas.find((area) => area.id === mockIds.areas.sanctum)!;

    const resolved = resolveAreaEnvironmentState(sanctum, {
      ...mockWorld.flags,
      sanctumSealBroken: true,
      wardenAlertRaised: true,
    });

    expect(resolved.id).toBe('env:sanctum-awakened');
    expect(resolved.hazard).toBe('volatile');
  });

  it('builds deterministic world-flag mutations for environment debug simulation', () => {
    const sanctum = mockAreas.find((area) => area.id === mockIds.areas.sanctum)!;

    const mutation = buildAreaEnvironmentDebugMutation(
      sanctum,
      'env:sanctum-open',
    );

    expect(mutation?.worldFlagPatch).toEqual({
      sanctumSealBroken: true,
      wardenAlertRaised: false,
    });
  });

  it('hides hidden areas from normal navigation until they are discovered or unlocked', () => {
    const grotto = mockAreas.find((area) => area.id === mockIds.areas.grotto)!;

    expect(
      isAreaVisibleInNavigation(grotto, [mockIds.areas.crossroads], [mockIds.areas.crossroads]),
    ).toBe(false);
    expect(
      isAreaVisibleInNavigation(
        grotto,
        [mockIds.areas.crossroads, mockIds.areas.grotto],
        [mockIds.areas.crossroads],
      ),
    ).toBe(true);
  });
});
