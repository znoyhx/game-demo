import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GameHud } from '../../src/components/game/GameHud';
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
import { buildGamePageViewModel } from '../../src/pages/Game/gameViewModel';

const buildViewModel = (snapshot = structuredClone(mockSaveSnapshot)) => {
  const store = createGameStore(snapshot);
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
  });
};

const renderHudMarkup = (viewModel: ReturnType<typeof buildViewModel>) =>
  renderToStaticMarkup(
    createElement(GameHud, {
      topBar: {
        ...viewModel.topBar,
        isSaving: false,
      },
      leftSidebar: viewModel.leftSidebar,
      scene: viewModel.scene,
      rightSidebar: viewModel.rightSidebar,
      bottom: {
        dialogueTitle: '事件状态',
        dialogueSpeaker: viewModel.scene.areaName,
        dialogueLines: [
          {
            speaker: '系统',
            text: viewModel.scene.description,
          },
        ],
        controls: [],
        logs: viewModel.logs,
        tips: viewModel.tips,
        statusMessage: '用于验证事件展示文案。',
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

describe('game event availability display', () => {
  it('marks blocked area events as 当前不可触发 and shows localized reasons', () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.player.currentAreaId = mockIds.areas.crossroads;
    snapshot.map!.currentAreaId = mockIds.areas.crossroads;
    snapshot.world.timeOfDay = '正午';
    snapshot.world.flags.ashfallWarningSeen = false;
    snapshot.events.director.worldTension = 30;
    snapshot.events.history = snapshot.events.history.filter(
      (entry) => entry.eventId !== mockIds.events.ashfallWarning,
    );

    const viewModel = buildViewModel(snapshot);
    const ashfallWarning = viewModel.scene.events.find(
      (event) => event.id === mockIds.events.ashfallWarning,
    );
    const supplyShortfall = viewModel.scene.events.find(
      (event) => event.id === mockIds.events.supplyShortfall,
    );
    const marketPanic = viewModel.scene.events.find(
      (event) => event.id === mockIds.events.marketPanic,
    );
    expect(ashfallWarning?.naturallyTriggerable).toBe(true);
    expect(supplyShortfall?.naturallyTriggerable).toBe(false);
    expect(supplyShortfall?.naturalReason).toBe('需要在“暮色将尽”时触发。');
    expect(marketPanic?.naturallyTriggerable).toBe(false);
    expect(marketPanic?.naturalReason).toBe('需要满足前置条件：已见到灰烬预警。');

    const markup = renderHudMarkup(viewModel);

    expect(markup).toContain('当前可触发');
    expect(markup).toContain('当前不可触发');
    expect(markup).toContain('需要在“暮色将尽”时触发。');
    expect(markup).toContain('需要满足前置条件：已见到灰烬预警。');
  });

  it('marks crossroads pressure events as 当前可触发 when conditions are met', () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.player.currentAreaId = mockIds.areas.crossroads;
    snapshot.map!.currentAreaId = mockIds.areas.crossroads;
    snapshot.world.timeOfDay = '暮色将尽';
    snapshot.world.flags.ashfallWarningSeen = true;
    snapshot.events.director.worldTension = 68;
    snapshot.events.history = snapshot.events.history.filter(
      (entry) =>
        entry.eventId !== mockIds.events.supplyShortfall &&
        entry.eventId !== mockIds.events.marketPanic,
    );

    const viewModel = buildViewModel(snapshot);
    const supplyShortfall = viewModel.scene.events.find(
      (event) => event.id === mockIds.events.supplyShortfall,
    );
    const marketPanic = viewModel.scene.events.find(
      (event) => event.id === mockIds.events.marketPanic,
    );
    expect(supplyShortfall?.naturallyTriggerable).toBe(true);
    expect(supplyShortfall?.naturalReason).toBe('事件触发条件已满足。');
    expect(marketPanic?.naturallyTriggerable).toBe(true);
    expect(marketPanic?.naturalReason).toBe('事件触发条件已满足。');

    const markup = renderHudMarkup(viewModel);
    expect(markup).toContain('当前可触发');
  });

  it('updates explicit event markers with the same availability messaging', () => {
    const blockedSnapshot = structuredClone(mockSaveSnapshot);
    blockedSnapshot.player.currentAreaId = mockIds.areas.sanctum;
    blockedSnapshot.map!.currentAreaId = mockIds.areas.sanctum;
    blockedSnapshot.player.profileTags = blockedSnapshot.player.profileTags.filter(
      (tag) => tag !== 'risky',
    );
    blockedSnapshot.playerModel!.tags = blockedSnapshot.playerModel!.tags.filter(
      (tag) => tag !== 'risky',
    );
    blockedSnapshot.events.director.pendingEventIds = blockedSnapshot.events.director.pendingEventIds.filter(
      (eventId) => eventId !== mockIds.events.wardenCountermeasure,
    );

    const blockedViewModel = buildViewModel(blockedSnapshot);
    const blockedMarker = blockedViewModel.scene.stage.markers.find(
      (marker) =>
        marker.type === 'event' &&
        marker.targetId === mockIds.events.wardenCountermeasure,
    );

    expect(blockedMarker?.caption).toBe('需要玩家风格为“高风险”。');

    const readySnapshot = structuredClone(mockSaveSnapshot);
    readySnapshot.player.currentAreaId = mockIds.areas.sanctum;
    readySnapshot.map!.currentAreaId = mockIds.areas.sanctum;
    readySnapshot.events.director.pendingEventIds = readySnapshot.events.director.pendingEventIds.filter(
      (eventId) => eventId !== mockIds.events.wardenCountermeasure,
    );

    const readyViewModel = buildViewModel(readySnapshot);
    const readyMarker = readyViewModel.scene.stage.markers.find(
      (marker) =>
        marker.type === 'event' &&
        marker.targetId === mockIds.events.wardenCountermeasure,
    );

    expect(readyMarker?.caption).toBe('当前可触发事件');
  });
});
