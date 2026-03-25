import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { PlayerModelController } from '../../src/core/controllers';
import {
  mockIds,
  playerModelBehaviorReplayPresets,
  playerModelPresetScenarios,
} from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

describe('PlayerModelController', () => {
  it('records behavior signals and refreshes the player model state', async () => {
    const store = createGameStore();
    const controller = new PlayerModelController({
      store,
      agents: createMockAgentSet(),
    });

    await controller.recordAreaVisit(mockIds.areas.sanctum, {
      autoSave: false,
    });
    await controller.recordExplorationSearch(
      {
        resourceFound: true,
        triggeredAmbush: false,
      },
      {
        autoSave: false,
      },
    );
    await controller.recordCombatChoice('special', {
      autoSave: false,
    });
    await controller.recordNpcInteraction(
      {
        intent: 'quest',
        trustDelta: 2,
        relationshipDelta: 1,
      },
      {
        autoSave: false,
      },
    );
    await controller.recordQuestChoice('branch:fast-direct-route', {
      autoSave: false,
    });

    const playerModel = store.getState().playerModel;

    expect(playerModel.recentAreaVisits).toContain(mockIds.areas.sanctum);
    expect(playerModel.recentCombatActions).toContain('special');
    expect(playerModel.recentNpcInteractionIntents).toContain('quest');
    expect(playerModel.recentQuestChoices).toContain('branch:fast-direct-route');
    expect(playerModel.signalWeights.exploration).toBeGreaterThan(0);
    expect(playerModel.tags.length).toBeGreaterThan(0);
    expect(playerModel.riskForecast).toBeTruthy();
    expect(playerModel.stuckPoint).toBeTruthy();
    expect(store.getState().player.profileTags).toEqual(playerModel.tags);
  });

  it('supports manual injection, behavior replay, preset scenarios and clear flow', async () => {
    const store = createGameStore();
    const controller = new PlayerModelController({
      store,
      agents: createMockAgentSet(),
    });

    await controller.injectPlayerTags(['social', 'story'], {
      autoSave: false,
      label: '手动测试画像',
    });

    expect(store.getState().playerModel.tags).toEqual(['social', 'story']);
    expect(store.getState().playerModel.debugProfile?.source).toBe('manual-tags');
    expect(store.getState().playerModel.debugProfile?.label).toBe('手动测试画像');
    expect(store.getState().debugTools.injectedPlayerTags).toEqual(['social', 'story']);
    expect(
      store.getState().exportSaveSnapshot().playerModel?.debugProfile?.source,
    ).toBe('manual-tags');

    await controller.replayBehaviorProfile(
      playerModelBehaviorReplayPresets[1].replaySteps,
      {
        autoSave: false,
        label: playerModelBehaviorReplayPresets[1].label,
      },
    );

    expect(store.getState().playerModel.debugProfile?.source).toBe('behavior-replay');
    expect(store.getState().playerModel.tags).toContain('speedrun');
    expect(store.getState().playerModel.tags).toContain('risky');

    await controller.applyDebugScenario(playerModelPresetScenarios[0], {
      autoSave: false,
    });

    expect(store.getState().playerModel.debugProfile?.source).toBe('preset-scenario');
    expect(store.getState().playerModel.debugProfile?.label).toBe(
      playerModelPresetScenarios[0].label,
    );
    expect(store.getState().playerModel.tags.length).toBeGreaterThan(0);

    await controller.clearInjectedPlayerProfile({
      autoSave: false,
    });

    expect(store.getState().playerModel.debugProfile).toBeUndefined();
    expect(store.getState().debugTools.injectedPlayerTags).toEqual([]);
    expect(store.getState().player.profileTags).toEqual(store.getState().playerModel.tags);
  });
});
