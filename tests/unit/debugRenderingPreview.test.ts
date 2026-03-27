import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { RenderingPreviewGallery } from '../../src/components/debug/RenderingPreviewGallery';
import { gameLogStore } from '../../src/core/logging';
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

describe('debug rendering preview gallery', () => {
  beforeEach(() => {
    gameStore.getState().resetToMockSnapshot();
    gameLogStore.getState().clearLogs();
  });

  it('renders isolated preview panels for map, markers, dialogue, and quests', () => {
    const preview = buildRenderingPreviewViewModel({
      source: buildSource(),
      previewAreaId: null,
      forcedAreaId: null,
      onMarkerActivate: () => {},
      onControlSelect: () => {},
      copy: locale.pages.debug.renderLab,
    });

    const markup = renderToStaticMarkup(
      createElement(RenderingPreviewGallery, {
        preview,
        onPreviewAreaSelect: () => {},
        onOpenForcedScene: () => {},
        onClearForcedScene: () => {},
      }),
    );

    expect(markup).toContain(locale.pages.debug.renderLab.title);
    expect(markup).toContain(locale.pages.debug.renderLab.mapAreaTitle);
    expect(markup).toContain(locale.pages.debug.renderLab.npcLayerTitle);
    expect(markup).toContain(locale.pages.debug.renderLab.interactionLayerTitle);
    expect(markup).toContain('对话与指令');
    expect(markup).toContain('进行中的任务');
  });
});
