import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { GameHud } from '../../src/components/game/GameHud';
import { gameLogStore } from '../../src/core/logging';
import { mockIds } from '../../src/core/mocks/mvp/constants';
import {
  gameStore,
  selectAreas,
  selectCombatEncounters,
  selectCombatState,
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
import { buildForcedRenderMapState } from '../../src/core/state/renderPreview';
import { buildGamePageViewModel } from '../../src/pages/Game/gameViewModel';

describe('game page forced area rendering', () => {
  beforeEach(() => {
    gameStore.getState().resetToMockSnapshot();
    gameLogStore.getState().clearLogs();
  });

  it('renders forced-area HUD props for any target area', () => {
    const state = gameStore.getState();
    const areas = selectAreas(state);
    const sanctumArea = areas.find((area) => area.id === mockIds.areas.sanctum);

    expect(sanctumArea).toBeTruthy();

    const viewModel = buildGamePageViewModel({
      worldSummary: selectWorldSummary(state),
      worldRuntime: selectWorldRuntime(state),
      worldFlags: selectWorldFlags(state),
      currentArea: sanctumArea ?? null,
      areas,
      mapState: buildForcedRenderMapState(
        selectMapState(state),
        sanctumArea?.id ?? null,
      ),
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

    const markup = renderToStaticMarkup(
      createElement(GameHud, {
        topBar: {
          ...viewModel.topBar,
          isSaving: false,
        },
        leftSidebar: viewModel.leftSidebar,
        scene: viewModel.scene,
        rightSidebar: viewModel.rightSidebar,
        bottom: {
          dialogueTitle: 'Scene Briefing',
          dialogueSpeaker: viewModel.scene.areaName,
          dialogueLines: [
            {
              speaker: 'System',
              text: viewModel.scene.description,
            },
          ],
          controls: [
            {
              id: 'clear-forced-render',
              label: 'Return to Live Route',
              tone: 'info' as const,
            },
          ],
          logs: viewModel.logs,
          tips: viewModel.tips,
          statusMessage: 'Forced render active.',
          activeControlId: null,
        },
        busyAreaId: null,
        onManualSave: () => {},
        onAreaSelect: () => {},
        onNpcSelect: () => {},
        onMarkerActivate: () => {},
        onEventActivate: () => {},
        onControlSelect: () => {},
      }),
    );

    expect(markup).toContain(sanctumArea?.name ?? '');
    expect(markup).toContain(sanctumArea?.interactionPoints[0]?.label ?? '');
    expect(markup).toContain('Return to Live Route');
  });
});
