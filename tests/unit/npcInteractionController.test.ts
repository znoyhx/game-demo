import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { NpcInteractionController } from '../../src/core/controllers/npcInteractionController';
import { QuestProgressionController } from '../../src/core/controllers/questProgressionController';
import { ReviewGenerationController } from '../../src/core/controllers/reviewGenerationController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

const fixedNow = () => '2026-03-24T12:00:00.000Z';

describe('npc interaction controller', () => {
  it('issues an NPC quest, updates relation state, and persists NPC changes in saves', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.quests.progress = snapshot.quests.progress.map((progress) =>
      progress.questId === mockIds.quests.main
        ? {
            ...progress,
            status: 'available',
            currentObjectiveIndex: 0,
            completedObjectiveIds: [],
            updatedAt: fixedNow(),
          }
        : progress,
    );
    snapshot.npcs.runtime = snapshot.npcs.runtime.map((npcState) =>
      npcState.npcId === mockIds.npcs.lyra
        ? {
            ...npcState,
            hasGivenQuestIds: [],
            relationshipNetwork: [],
          }
        : npcState,
    );

    const store = createGameStore(snapshot);
    const saveWriter = new SaveWriterSpy();
    const agents = createMockAgentSet();
    const reviewController = new ReviewGenerationController({
      store,
      agents,
      now: fixedNow,
    });
    const questController = new QuestProgressionController({
      store,
      saveController: saveWriter,
      reviewController,
      now: fixedNow,
    });
    const controller = new NpcInteractionController({
      store,
      agents,
      saveController: saveWriter,
      questController,
      reviewController,
      now: fixedNow,
    });

    await controller.startDialogue(mockIds.npcs.lyra);
    const result = await controller.chooseDialogueOption(mockIds.npcs.lyra, 'quest');
    const exportedSnapshot = store.getState().exportSaveSnapshot();
    const persistedLyra = exportedSnapshot.npcs.runtime.find(
      (entry) => entry.npcId === mockIds.npcs.lyra,
    );

    expect(store.getState().questProgressById[mockIds.quests.main]?.status).toBe(
      'active',
    );
    expect(result?.state.hasGivenQuestIds).toContain(mockIds.quests.main);
    expect(
      result?.state.relationshipNetwork.find(
        (edge) => edge.targetNpcId === mockIds.npcs.rowan,
      )?.strength,
    ).toBe(6);
    expect(
      result?.history.some(
        (turn) =>
          turn.speaker === 'system' && turn.text.includes('任务已发放：重燃守护火线'),
      ),
    ).toBe(true);
    expect(persistedLyra?.memory.lastInteractionAt).toBe(fixedNow());
    expect(persistedLyra?.hasGivenQuestIds).toContain(mockIds.quests.main);
    expect(store.getState().reviewState.current?.trigger).toBe('npc-interaction');
    expect(
      store.getState().reviewState.current?.npcAttitudeReasons[0]?.npcName,
    ).toContain('莱拉');
    expect(store.getState().ui.activePanel).toBe('npc');
    expect(saveWriter.calls).toEqual(['auto']);
  });

  it('applies item exchange results and persists updated inventory state', async () => {
    const store = createGameStore(structuredClone(mockSaveSnapshot));
    const saveWriter = new SaveWriterSpy();
    const questController = new QuestProgressionController({
      store,
      saveController: saveWriter,
      now: fixedNow,
    });
    const controller = new NpcInteractionController({
      store,
      agents: createMockAgentSet(),
      saveController: saveWriter,
      questController,
      now: fixedNow,
    });

    await controller.startDialogue(mockIds.npcs.brom);
    const result = await controller.chooseDialogueOption(mockIds.npcs.brom, 'trade');
    const exportedSnapshot = store.getState().exportSaveSnapshot();

    expect(store.getState().player.gold).toBe(mockSaveSnapshot.player.gold - 6);
    expect(
      store
        .getState()
        .player.inventory.some((entry) => entry.itemId === 'item:ember-salve'),
    ).toBe(true);
    expect(
      store.getState().npcStatesById[mockIds.npcs.brom].relationshipNetwork.find(
        (edge) => edge.targetNpcId === mockIds.npcs.lyra,
      )?.strength,
    ).toBe(30);
    expect(
      result?.history.some(
        (turn) =>
          turn.speaker === 'system' && turn.text.includes('余烬药膏'),
      ),
    ).toBe(true);
    expect(exportedSnapshot.player.gold).toBe(mockSaveSnapshot.player.gold - 6);
    expect(
      exportedSnapshot.player.inventory.some(
        (entry) => entry.itemId === 'item:ember-salve',
      ),
    ).toBe(true);
    expect(saveWriter.calls).toEqual(['auto']);
  });
});
