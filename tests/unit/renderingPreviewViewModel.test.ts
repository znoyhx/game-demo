import { beforeEach, describe, expect, it } from 'vitest';

import { gameLogStore } from '../../src/core/logging';
import { mockAreas } from '../../src/core/mocks/mvp/areas';
import { mockIds } from '../../src/core/mocks/mvp/constants';
import {
  gameStore,
  selectAreas,
  selectCombatEncounters,
  selectCombatState,
  selectCurrentArea,
  selectCurrentReview,
  selectEventDefinitions,
  selectEventDirector,
  selectEventHistory,
  selectExplorationState,
  selectGameConfig,
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
import { locale } from '../../src/core/utils/locale';
import { buildRenderingPreviewViewModel } from '../../src/pages/Debug/renderingPreviewViewModel';

const buildSource = () => {
  const state = gameStore.getState();

  return {
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
    explorationState: selectExplorationState(state),
    combatEncounters: selectCombatEncounters(state),
    combatState: selectCombatState(state),
    eventDefinitions: selectEventDefinitions(state),
    eventHistory: selectEventHistory(state),
    eventDirector: selectEventDirector(state),
    review: selectCurrentReview(state),
    gameConfig: selectGameConfig(state),
    saveMetadata: selectSaveMetadata(state),
    saveStatus: selectSaveStatus(state),
    logEntries: gameLogStore.getState().entries,
  };
};

describe('rendering preview view model', () => {
  beforeEach(() => {
    gameStore.getState().resetToMockSnapshot();
    gameLogStore.getState().clearLogs();
  });

  it('builds an isolated preview for any target area', () => {
    const sanctumArea = mockAreas.find((area) => area.id === mockIds.areas.sanctum);
    expect(sanctumArea).toBeTruthy();

    const preview = buildRenderingPreviewViewModel({
      source: buildSource(),
      previewAreaId: mockIds.areas.sanctum,
      forcedAreaId: null,
      onMarkerActivate: () => {},
      onControlSelect: () => {},
      copy: locale.pages.debug.renderLab,
    });

    expect(preview.selectedAreaId).toBe(mockIds.areas.sanctum);
    expect(preview.scene.areaName).toBe(sanctumArea?.name);
    expect(preview.scene.stage.markers.some((marker) => marker.type === 'battle')).toBe(
      true,
    );
    expect(preview.areaOptions.find((area) => area.id === mockIds.areas.sanctum)?.isSelected).toBe(
      true,
    );
  });
});
