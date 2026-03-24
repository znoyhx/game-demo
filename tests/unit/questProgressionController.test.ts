import { describe, expect, it } from 'vitest';

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
});
