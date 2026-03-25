import { describe, expect, it } from 'vitest';

import { AreaNavigationController } from '../../src/core/controllers/areaNavigationController';
import { ExplorationEncounterController } from '../../src/core/controllers/explorationEncounterController';
import { EventTriggerController } from '../../src/core/controllers/eventTriggerController';
import { QuestProgressionController } from '../../src/core/controllers/questProgressionController';
import { createMockAgentSet } from '../../src/core/agents';
import { createGameEventBus } from '../../src/core/events/domainEvents';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import {
  createGameStore,
  selectExplorationState,
  selectMapState,
} from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

describe('area navigation controller', () => {
  it('enters a connected area, records the transition, and autosaves', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const eventBus = createGameEventBus(() => '2026-03-24T00:00:00.000Z');
    const seenPayloads: Array<{ areaId: string; previousAreaId?: string }> = [];
    eventBus.subscribe('AREA_ENTERED', (payload) => {
      seenPayloads.push({
        areaId: payload.areaId,
        previousAreaId: payload.previousAreaId,
      });
    });

    const controller = new AreaNavigationController({
      store,
      eventBus,
      saveController: saveWriter,
    });

    const result = await controller.enterArea(mockIds.areas.crossroads);

    expect(result?.ok).toBe(true);
    expect(store.getState().mapState.currentAreaId).toBe(mockIds.areas.crossroads);
    const visitHistory = selectMapState(store.getState()).visitHistory;

    expect(visitHistory[visitHistory.length - 1]).toBe(mockIds.areas.crossroads);
    expect(saveWriter.calls).toEqual(['auto']);
    expect(seenPayloads).toEqual([
      {
        areaId: mockIds.areas.crossroads,
        previousAreaId: mockIds.areas.archive,
      },
    ]);
  });

  it('preserves visit history order when leaving and re-entering areas', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const controller = new AreaNavigationController({
      store,
      saveController: saveWriter,
    });

    await controller.enterArea(mockIds.areas.crossroads);
    await controller.enterArea(mockIds.areas.archive);

    expect(selectMapState(store.getState()).visitHistory).toEqual([
      mockIds.areas.crossroads,
      mockIds.areas.archive,
      mockIds.areas.crossroads,
      mockIds.areas.archive,
    ]);
    expect(saveWriter.calls).toEqual(['auto', 'auto']);
  });

  it('blocks transitions to locked areas when enter conditions are not met', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const controller = new AreaNavigationController({
      store,
      saveController: saveWriter,
    });

    const result = await controller.enterArea(mockIds.areas.sanctum);

    expect(result?.ok).toBe(false);
    expect(store.getState().mapState.currentAreaId).toBe(mockIds.areas.archive);
    expect(saveWriter.calls).toHaveLength(0);
  });

  it('unlocks and persists a hidden area once its route conditions are satisfied', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const controller = new AreaNavigationController({
      store,
      saveController: saveWriter,
    });

    const result = await controller.enterArea(mockIds.areas.grotto);
    const exportedSnapshot = store.getState().exportSaveSnapshot();

    expect(result?.ok).toBe(true);
    expect(result?.shouldUnlock).toBe(true);
    expect(store.getState().mapState.currentAreaId).toBe(mockIds.areas.grotto);
    expect(store.getState().mapState.unlockedAreaIds).toContain(mockIds.areas.grotto);
    expect(store.getState().mapState.discoveredAreaIds).toContain(mockIds.areas.grotto);
    expect(exportedSnapshot.map?.currentAreaId).toBe(mockIds.areas.grotto);
    expect(exportedSnapshot.map?.unlockedAreaIds).toContain(mockIds.areas.grotto);
  });

  it('triggers eligible location events on area enter without adding an extra autosave', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.world.flags.ashfallWarningSeen = false;
    snapshot.events.history = snapshot.events.history.filter(
      (entry) => entry.eventId !== mockIds.events.ashfallWarning,
    );

    const store = createGameStore(snapshot);
    const saveWriter = new SaveWriterSpy();
    const questController = new QuestProgressionController({
      store,
      saveController: saveWriter,
    });
    const eventController = new EventTriggerController({
      store,
      agents: createMockAgentSet(),
      saveController: saveWriter,
      questController,
    });
    const controller = new AreaNavigationController({
      store,
      saveController: saveWriter,
      questController,
      eventController,
    });

    const result = await controller.enterArea(mockIds.areas.crossroads);
    const triggeredEvent = store
      .getState()
      .eventHistory.find((entry) => entry.eventId === mockIds.events.ashfallWarning);

    expect(result?.ok).toBe(true);
    expect(triggeredEvent?.source).toBe('location');
    expect(store.getState().worldRuntime.flags.ashfallWarningSeen).toBe(true);
    expect(saveWriter.calls).toEqual(['auto']);
  });

  it('wires on-enter exploration signals into normal area navigation without extra saves', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const explorationController = new ExplorationEncounterController({
      store,
      now: () => '2026-03-25T09:00:00.000Z',
    });
    const controller = new AreaNavigationController({
      store,
      saveController: saveWriter,
      explorationController,
    });

    const result = await controller.enterArea(mockIds.areas.grotto);

    expect(result?.ok).toBe(true);
    expect(selectExplorationState(store.getState()).signals).toHaveLength(1);
    expect(selectExplorationState(store.getState()).signals[0]?.areaId).toBe(
      mockIds.areas.grotto,
    );
    expect(saveWriter.calls).toEqual(['auto']);
  });
});
