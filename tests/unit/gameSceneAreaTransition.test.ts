import { describe, expect, it } from 'vitest';

import { buildGamePageViewModel } from '../../src/pages/Game/gameViewModel';
import { AreaNavigationController } from '../../src/core/controllers/areaNavigationController';
import { gameLogStore } from '../../src/core/logging';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import {
  createGameStore,
  selectAreas,
  selectCombatEncounters,
  selectCombatState,
  selectCurrentArea,
  selectCurrentReview,
  selectEventDefinitions,
  selectEventDirector,
  selectEventHistory,
  selectMapState,
  selectNpcDefinitions,
  selectNpcStates,
  selectPlayerModelState,
  selectPlayerState,
  selectQuestDefinitions,
  selectQuestProgressEntries,
  selectSaveMetadata,
  selectSaveStatus,
  selectWorldFlags,
  selectWorldRuntime,
  selectWorldSummary,
} from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

const buildViewModel = (store: ReturnType<typeof createGameStore>) => {
  const state = store.getState();

  return buildGamePageViewModel({
    worldSummary: selectWorldSummary(state),
    worldRuntime: selectWorldRuntime(state),
    worldFlags: selectWorldFlags(state),
    currentArea: selectCurrentArea(state),
    areas: selectAreas(state),
    mapState: selectMapState(state),
    questDefinitions: selectQuestDefinitions(state),
    questProgressEntries: selectQuestProgressEntries(state),
    npcDefinitions: selectNpcDefinitions(state),
    npcStates: selectNpcStates(state),
    player: selectPlayerState(state),
    playerModel: selectPlayerModelState(state),
    combatEncounters: selectCombatEncounters(state),
    combatState: selectCombatState(state),
    eventDefinitions: selectEventDefinitions(state),
    eventHistory: selectEventHistory(state),
    eventDirector: selectEventDirector(state),
    review: selectCurrentReview(state),
    saveMetadata: selectSaveMetadata(state),
    saveStatus: selectSaveStatus(state),
    logEntries: gameLogStore.getState().entries,
  });
};

describe('game scene area transition wiring', () => {
  it('updates the rendered scene model after an area transition', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const saveWriter = new SaveWriterSpy();
    const controller = new AreaNavigationController({
      store,
      saveController: saveWriter,
    });

    const before = buildViewModel(store);

    await controller.enterArea(mockIds.areas.crossroads);

    const after = buildViewModel(store);
    const crossroads = selectAreas(store.getState()).find(
      (area) => area.id === mockIds.areas.crossroads,
    );

    expect(before.scene.renderScene.areaId).toBe(mockIds.areas.archive);
    expect(after.scene.renderScene.areaId).toBe(mockIds.areas.crossroads);
    expect(after.scene.renderScene.viewport.widthTiles).toBe(
      crossroads?.scene.grid.width,
    );
    expect(after.scene.renderScene.tiles).not.toEqual(before.scene.renderScene.tiles);
    expect(after.scene.renderScene.entities).not.toEqual(before.scene.renderScene.entities);
    expect(saveWriter.calls).toEqual(['auto']);
  });
});
