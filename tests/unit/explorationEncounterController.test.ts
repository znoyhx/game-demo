import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import {
  CombatController,
  ExplorationEncounterController,
} from '../../src/core/controllers';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import {
  createGameStore,
  selectCombatState,
  selectExplorationState,
  selectPlayerState,
} from '../../src/core/state';

describe('exploration encounter controller', () => {
  it('spawns a deterministic on-enter exploration signal for configured areas', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const controller = new ExplorationEncounterController({
      store,
      now: () => '2026-03-25T10:00:00.000Z',
    });

    const result = await controller.handleAreaEnter(mockIds.areas.grotto, {
      autoSave: false,
    });
    const explorationState = selectExplorationState(store.getState());

    expect(result?.areaId).toBe(mockIds.areas.grotto);
    expect(result?.signals).toHaveLength(1);
    expect(explorationState.signals).toHaveLength(1);
    expect(explorationState.signals[0]?.areaId).toBe(mockIds.areas.grotto);
    expect(explorationState.signals[0]?.status).toBe('pending');
    expect(
      store.getState().combatEncountersById[result?.signals[0]?.encounterId ?? ''],
    ).toBeTruthy();
  });

  it('searches item points, grants resources, and exposes exploration ambushes', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const controller = new ExplorationEncounterController({
      store,
      now: () => '2026-03-25T10:05:00.000Z',
    });

    const result = await controller.searchInteraction(
      'interaction:archive-relay-cache',
      {
        autoSave: false,
      },
    );
    const explorationState = selectExplorationState(store.getState());
    const playerState = selectPlayerState(store.getState());

    expect(result?.searchedAlready).toBe(false);
    expect(result?.resourceGain?.resourceNodeId).toBe(
      'resource-node:archive-relay-core',
    );
    expect(
      explorationState.searchedInteractionIds.includes(
        'interaction:archive-relay-cache',
      ),
    ).toBe(true);
    expect(
      explorationState.collectedResourceNodeIds.includes(
        'resource-node:archive-relay-core',
      ),
    ).toBe(true);
    expect(result?.signals).toHaveLength(1);
    expect(
      playerState.inventory.some(
        (entry) =>
          entry.itemId === 'item:relay-core-fragment' && entry.quantity >= 1,
      ),
    ).toBe(true);
  });

  it('activates exploration signals into combat and removes the pending map marker', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const combatController = new CombatController({
      store,
      agents: createMockAgentSet(),
    });
    const controller = new ExplorationEncounterController({
      store,
      combatController,
      now: () => '2026-03-25T10:10:00.000Z',
    });

    const searchResult = await controller.searchInteraction(
      'interaction:archive-relay-cache',
      {
        autoSave: false,
      },
    );
    const signalId = searchResult?.signals[0]?.id;

    expect(signalId).toBeTruthy();

    const activationResult = await controller.activateSignal(signalId!, {
      autoSave: false,
    });

    expect(activationResult?.signal.id).toBe(signalId);
    expect(selectCombatState(store.getState())?.encounterId).toBe(
      activationResult?.signal.encounterId,
    );
    expect(
      selectExplorationState(store.getState()).signals.some(
        (signal) => signal.id === signalId,
      ),
    ).toBe(false);
  });
});
