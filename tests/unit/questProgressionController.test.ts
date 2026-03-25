import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { ReviewGenerationController } from '../../src/core/controllers';
import { QuestProgressionController } from '../../src/core/controllers/questProgressionController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

describe('quest progression controller', () => {
  it('auto-activates the dynamic quest once its trigger conditions are satisfied', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const controller = new QuestProgressionController({
      store,
      now: () => '2026-03-24T00:00:00.000Z',
    });

    store.getState().setCurrentAreaId(mockIds.areas.sanctum);
    store.getState().setWorldFlag('wardenAlertRaised', true);

    const updates = await controller.refreshQuestStatuses({
      autoSave: false,
    });
    const dynamicProgress = store.getState().questProgressById[mockIds.quests.dynamic];
    const dynamicHistory = store
      .getState()
      .questHistory.filter((entry) => entry.questId === mockIds.quests.dynamic);

    expect(updates.map((entry) => entry.questId)).toContain(mockIds.quests.dynamic);
    expect(dynamicProgress?.status).toBe('active');
    expect(dynamicHistory[dynamicHistory.length - 1]?.note).toContain('动态任务');
  });

  it('generates a quest-branch review without interrupting the current panel', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const reviewController = new ReviewGenerationController({
      store,
      agents: createMockAgentSet(),
      now: () => '2026-03-24T01:00:00.000Z',
    });
    const controller = new QuestProgressionController({
      store,
      reviewController,
      now: () => '2026-03-24T01:00:00.000Z',
    });

    store.getState().setActivePanel('quest');

    await controller.chooseBranch(
      mockIds.quests.main,
      'branch:main-trust-rowan',
    );

    expect(
      store.getState().questProgressById[mockIds.quests.main]?.chosenBranchId,
    ).toBe('branch:main-trust-rowan');
    expect(store.getState().reviewState.current?.trigger).toBe('quest-branch');
    expect(store.getState().reviewState.current?.questBranchReasons[0]?.branchLabel).toBe(
      '争取罗文的巡逻支援',
    );
    expect(store.getState().ui.activePanel).toBe('quest');
  });

  it('opens a run review when the main quest is forced to failed', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const reviewController = new ReviewGenerationController({
      store,
      agents: createMockAgentSet(),
      now: () => '2026-03-24T02:00:00.000Z',
    });
    const controller = new QuestProgressionController({
      store,
      reviewController,
      now: () => '2026-03-24T02:00:00.000Z',
    });

    await controller.forceQuestStatus(mockIds.quests.main, 'failed');

    expect(store.getState().reviewState.current?.trigger).toBe('run-failed');
    expect(store.getState().reviewState.current?.outcomeFactors.some((factor) => factor.kind === 'failure')).toBe(true);
    expect(store.getState().ui.activePanel).toBe('review');
  });
});
