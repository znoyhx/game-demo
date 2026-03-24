import { describe, expect, it } from 'vitest';

import { AreaDebugController } from '../../src/core/controllers/areaDebugController';
import { AreaNavigationController } from '../../src/core/controllers/areaNavigationController';
import { createGameEventBus } from '../../src/core/events/domainEvents';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import {
  createGameStore,
  selectDebugToolsState,
  selectMapState,
  selectWorldFlags,
} from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

describe('area debug controller', () => {
  it('jumps directly into a hidden area, discovers it, unlocks it, and autosaves', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const eventBus = createGameEventBus(() => '2026-03-24T08:00:00.000Z');
    const seenPayloads: Array<{ areaId: string; previousAreaId?: string }> = [];
    eventBus.subscribe('AREA_ENTERED', (payload) => {
      seenPayloads.push({
        areaId: payload.areaId,
        previousAreaId: payload.previousAreaId,
      });
    });

    const controller = new AreaDebugController({
      store,
      eventBus,
      saveController: saveWriter,
    });

    const result = await controller.jumpToArea(mockIds.areas.grotto);
    const debugState = selectDebugToolsState(store.getState());

    expect(result?.ok).toBe(true);
    expect(store.getState().mapState.currentAreaId).toBe(mockIds.areas.grotto);
    expect(selectMapState(store.getState()).discoveredAreaIds).toContain(mockIds.areas.grotto);
    expect(selectMapState(store.getState()).unlockedAreaIds).toContain(mockIds.areas.grotto);
    expect(debugState.debugModeEnabled).toBe(true);
    expect(debugState.logsPanelOpen).toBe(true);
    expect(saveWriter.calls).toEqual(['debug']);
    expect(seenPayloads).toEqual([
      {
        areaId: mockIds.areas.grotto,
        previousAreaId: mockIds.areas.archive,
      },
    ]);
  });

  it('forces unlock and relock transitions for non-default areas', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const controller = new AreaDebugController({
      store,
      saveController: saveWriter,
    });

    const unlockResult = await controller.setAreaUnlocked(mockIds.areas.sanctum, true);
    const relockResult = await controller.setAreaUnlocked(mockIds.areas.sanctum, false);

    expect(unlockResult?.ok).toBe(true);
    expect(relockResult?.ok).toBe(true);
    expect(store.getState().mapState.unlockedAreaIds).not.toContain(mockIds.areas.sanctum);
    expect(saveWriter.calls).toEqual(['debug', 'debug']);
  });

  it('lets debug unlocks seed normal enter and exit route testing without full quest progression', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const debugController = new AreaDebugController({
      store,
      saveController: saveWriter,
    });
    const areaController = new AreaNavigationController({
      store,
      saveController: saveWriter,
    });

    await debugController.setAreaUnlocked(mockIds.areas.sanctum, true, {
      autoSave: false,
    });

    const enterResult = await areaController.enterArea(mockIds.areas.sanctum);
    const exitResult = await areaController.enterArea(mockIds.areas.archive);

    expect(enterResult?.ok).toBe(true);
    expect(exitResult?.ok).toBe(true);
    expect(store.getState().mapState.currentAreaId).toBe(mockIds.areas.archive);
    expect(selectMapState(store.getState()).visitHistory).toEqual([
      mockIds.areas.crossroads,
      mockIds.areas.archive,
      mockIds.areas.sanctum,
      mockIds.areas.archive,
    ]);
    expect(saveWriter.calls).toEqual(['auto', 'auto']);
  });

  it('simulates environment changes by applying deterministic world flags', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const controller = new AreaDebugController({
      store,
      saveController: saveWriter,
    });

    const result = await controller.simulateEnvironmentState(
      mockIds.areas.sanctum,
      'env:sanctum-awakened',
    );

    expect(result?.ok).toBe(true);
    expect(result?.resolvedState?.id).toBe('env:sanctum-awakened');
    expect(selectWorldFlags(store.getState()).sanctumSealBroken).toBe(true);
    expect(selectWorldFlags(store.getState()).wardenAlertRaised).toBe(true);
    expect(saveWriter.calls).toEqual(['debug']);
  });
});
