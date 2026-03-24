import { describe, expect, it } from 'vitest';

import { QuestDebugController } from '../../src/core/controllers/questDebugController';
import { QuestProgressionController } from '../../src/core/controllers/questProgressionController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

const fixedNow = () => '2026-03-24T10:00:00.000Z';

const buildControllers = () => {
  const store = createGameStore(mockSaveSnapshot);
  const saveWriter = new SaveWriterSpy();
  const questController = new QuestProgressionController({
    store,
    saveController: saveWriter,
    now: fixedNow,
  });
  const questDebugController = new QuestDebugController({
    store,
    questController,
    saveController: saveWriter,
    now: fixedNow,
  });

  return {
    store,
    saveWriter,
    questController,
    questDebugController,
  };
};

describe('quest debug controller', () => {
  it('directly activates, fails, and resets a quest through deterministic debug controls', async () => {
    const { store, saveWriter, questDebugController } = buildControllers();

    expect(store.getState().questProgressById[mockIds.quests.hidden]?.status).toBe(
      'locked',
    );

    await questDebugController.activateQuest(mockIds.quests.hidden);
    await questDebugController.setQuestStatus(mockIds.quests.hidden, 'failed');
    await questDebugController.resetQuest(mockIds.quests.hidden);

    expect(store.getState().questProgressById[mockIds.quests.hidden]?.status).toBe(
      'locked',
    );
    expect(store.getState().debugTools.forcedQuestId).toBe(mockIds.quests.hidden);
    expect(saveWriter.calls).toEqual(['debug', 'debug', 'debug']);
  });

  it('simulates trigger conditions to auto-activate the dynamic quest without a full playthrough', async () => {
    const { store, questDebugController } = buildControllers();

    await questDebugController.simulateCondition({
      questId: mockIds.quests.dynamic,
      conditionId: 'trigger:dynamic-current-area',
    });

    expect(store.getState().mapState.currentAreaId).toBe(mockIds.areas.sanctum);
    expect(store.getState().questProgressById[mockIds.quests.dynamic]?.status).toBe(
      'locked',
    );

    await questDebugController.simulateCondition({
      questId: mockIds.quests.dynamic,
      conditionId: 'trigger:dynamic-warden-alert',
    });

    expect(
      store.getState().worldRuntime.flags.wardenAlertRaised,
    ).toBe(true);
    expect(store.getState().questProgressById[mockIds.quests.dynamic]?.status).toBe(
      'active',
    );
  });

  it('jumps into a later quest stage and completes a selected branch through simulated validation', async () => {
    const { store, questDebugController } = buildControllers();
    const originalGold = mockSaveSnapshot.player.gold;
    const originalRowan = mockSaveSnapshot.npcs.runtime.find(
      (entry) => entry.npcId === mockIds.npcs.rowan,
    )!;

    await questDebugController.jumpToStage({
      questId: mockIds.quests.main,
      stageIndex: 3,
      chosenBranchId: 'branch:main-trust-rowan',
    });

    expect(store.getState().questProgressById[mockIds.quests.main]).toMatchObject({
      status: 'active',
      currentObjectiveIndex: 3,
      chosenBranchId: 'branch:main-trust-rowan',
    });

    await questDebugController.simulateCondition({
      questId: mockIds.quests.main,
      conditionId: 'condition:main-defeat-warden',
    });

    const mainProgress = store.getState().questProgressById[mockIds.quests.main];
    const latestMainHistory = store
      .getState()
      .questHistory.filter((entry) => entry.questId === mockIds.quests.main)
      .slice(-1)[0];

    expect(mainProgress?.status).toBe('completed');
    expect(mainProgress?.chosenBranchId).toBe('branch:main-trust-rowan');
    expect(store.getState().worldRuntime.flags.rowanPatrolSecured).toBe(true);
    expect(store.getState().player.gold).toBe(originalGold + 90);
    expect(
      store.getState().npcStatesById[mockIds.npcs.rowan]?.relationship,
    ).toBeGreaterThan(originalRowan.relationship);
    expect(latestMainHistory?.branchId).toBe('branch:main-trust-rowan');
  });

  it('exposes quest logs and quest-to-quest dependency links for debug views', () => {
    const { questDebugController } = buildControllers();
    const snapshot = questDebugController.getDebugSnapshot();
    const hiddenQuest = snapshot.quests.find(
      (quest) => quest.questId === mockIds.quests.hidden,
    );
    const sidePatrolQuest = snapshot.quests.find(
      (quest) => quest.questId === mockIds.quests.sidePatrol,
    );
    const mainNode = snapshot.dependencyGraph.find(
      (node) => node.questId === mockIds.quests.main,
    );

    expect(hiddenQuest?.dependencyQuestIds).toContain(mockIds.quests.sideArchive);
    expect(sidePatrolQuest?.dependencyQuestIds).toContain(mockIds.quests.main);
    expect(mainNode?.requiredBy).toContain(mockIds.quests.sidePatrol);
    expect(snapshot.logs.some((entry) => entry.questId === mockIds.quests.main)).toBe(
      true,
    );
  });
});
