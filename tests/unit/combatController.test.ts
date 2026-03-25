import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { CombatController, ReviewGenerationController } from '../../src/core/controllers';
import { mockIds } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

describe('CombatController', () => {
  it('starts an encounter and switches the game panel into combat', async () => {
    const store = createGameStore();
    const controller = new CombatController({
      store,
      agents: createMockAgentSet(),
    });

    const combatState = await controller.startEncounter(mockIds.encounter);

    expect(combatState?.encounterId).toBe(mockIds.encounter);
    expect(store.getState().ui.activePanel).toBe('combat');
    expect(store.getState().combatState?.turn).toBe(1);
    expect(store.getState().combatState?.player.hp).toBe(store.getState().player.hp);
  });

  it('advances combat and syncs player resources back into state', async () => {
    const store = createGameStore();
    const controller = new CombatController({
      store,
      agents: createMockAgentSet(),
    });

    await controller.startEncounter(mockIds.encounter);
    const result = await controller.submitPlayerAction('special');

    expect(result?.ok).toBe(true);
    expect(store.getState().combatState?.turn).toBe(2);
    expect(store.getState().player.hp).toBe(store.getState().combatState?.player.hp);
    expect(store.getState().player.energy).toBeLessThan(8);
  });

  it('honors forced debug tactics when they are configured', async () => {
    const store = createGameStore();
    const controller = new CombatController({
      store,
      agents: createMockAgentSet(),
    });

    store.getState().patchDebugToolsState({
      forcedTactic: 'trap',
    });

    await controller.startEncounter(mockIds.encounter);
    await controller.submitPlayerAction('attack');

    expect(store.getState().combatState?.activeTactic).toBe('trap');
  });

  it('starts encounters in a forced boss phase when debug state requests it', async () => {
    const store = createGameStore();
    const controller = new CombatController({
      store,
      agents: createMockAgentSet(),
    });

    store.getState().patchDebugToolsState({
      forcedPhaseId: 'phase:embers-unbound',
    });

    await controller.startEncounter(mockIds.encounter);

    expect(store.getState().combatState?.currentPhaseId).toBe(
      'phase:embers-unbound',
    );
    expect(store.getState().combatState?.activeTactic).toBe('aggressive');
  });

  it('records a resolved outcome and generates a review payload', async () => {
    const agents = createMockAgentSet();
    const store = createGameStore();
    const reviewController = new ReviewGenerationController({
      store,
      agents,
    });
    const controller = new CombatController({
      store,
      agents,
      reviewController,
    });

    await controller.startEncounter(mockIds.encounter);
    store.getState().setCombatState({
      ...store.getState().combatState!,
      turn: 4,
      currentPhaseId: 'phase:embers-unbound',
      enemy: {
        ...store.getState().combatState!.enemy,
        hp: 10,
      },
    });

    const result = await controller.submitPlayerAction('special');
    const latestHistory =
      store.getState().combatHistory[store.getState().combatHistory.length - 1];
    const currentReview = store.getState().reviewState.current;

    expect(result?.result).toBe('victory');
    expect(latestHistory?.result).toBe('victory');
    expect(latestHistory?.turnCount).toBe(4);
    expect(latestHistory?.finalPhaseId).toBe('phase:embers-unbound');
    expect(latestHistory?.keyPlayerBehaviors[0]?.actionType).toBe('special');
    expect(currentReview?.encounterId).toBe(mockIds.encounter);
    expect(currentReview?.combatSummary?.result.result).toBe('victory');
    expect(currentReview?.combatSummary?.result.totalTurns).toBe(4);
    expect(currentReview?.suggestions.length).toBeGreaterThan(0);
    expect(store.getState().reviewState.history.length).toBeGreaterThan(1);
    expect(store.getState().combatState).toBeNull();
    expect(store.getState().ui.activePanel).toBe('review');
  });
});
