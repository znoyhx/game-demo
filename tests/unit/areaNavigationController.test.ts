import { describe, expect, it } from 'vitest';

import { AreaNavigationController } from '../../src/core/controllers/areaNavigationController';
import { createGameEventBus } from '../../src/core/events/domainEvents';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore, selectMapState } from '../../src/core/state';

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
});
