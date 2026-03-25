import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { EventTriggerController } from '../../src/core/controllers/eventTriggerController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

describe('event trigger controller', () => {
  it('applies shop price change events into persisted director state', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.player.currentAreaId = mockIds.areas.crossroads;
    snapshot.map!.currentAreaId = mockIds.areas.crossroads;
    snapshot.events.history = snapshot.events.history.filter(
      (entry) => entry.eventId !== mockIds.events.marketPanic,
    );

    const saveWriter = new SaveWriterSpy();
    const store = createGameStore(snapshot);
    const controller = new EventTriggerController({
      store,
      agents: createMockAgentSet(),
      saveController: saveWriter,
      now: () => '2026-03-25T12:00:00.000Z',
    });

    const result = await controller.triggerEvent(mockIds.events.marketPanic, 'balance');
    const exportedSnapshot = store.getState().exportSaveSnapshot();

    expect(result).toBeTruthy();
    expect(store.getState().worldRuntime.flags.marketPanicActive).toBe(true);
    expect(
      store
        .getState()
        .eventDirector.shopPriceModifiers.find((entry) => entry.npcId === mockIds.npcs.brom)
        ?.multiplier,
    ).toBe(1.25);
    expect(
      exportedSnapshot.events.director.shopPriceModifiers.find(
        (entry) => entry.npcId === mockIds.npcs.brom,
      )?.multiplier,
    ).toBe(1.25);
    expect(saveWriter.calls).toEqual(['auto']);
  });

  it('moves NPCs between areas and keeps the result in the exported save snapshot', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.player.currentAreaId = mockIds.areas.archive;
    snapshot.map!.currentAreaId = mockIds.areas.archive;
    snapshot.events.history = snapshot.events.history.filter(
      (entry) => entry.eventId !== mockIds.events.patrolRedeployment,
    );
    snapshot.quests.progress = snapshot.quests.progress.map((entry) =>
      entry.questId === mockIds.quests.sidePatrol
        ? {
            ...entry,
            status: 'active',
          }
        : entry,
    );

    const saveWriter = new SaveWriterSpy();
    const store = createGameStore(snapshot);
    const controller = new EventTriggerController({
      store,
      agents: createMockAgentSet(),
      saveController: saveWriter,
      now: () => '2026-03-25T12:10:00.000Z',
    });

    const result = await controller.triggerEvent(mockIds.events.patrolRedeployment, 'relationship');
    const exportedSnapshot = store.getState().exportSaveSnapshot();

    expect(result).toBeTruthy();
    expect(store.getState().npcDefinitionsById[mockIds.npcs.rowan]?.areaId).toBe(
      mockIds.areas.crossroads,
    );
    expect(store.getState().areasById[mockIds.areas.crossroads]?.npcIds).toContain(
      mockIds.npcs.rowan,
    );
    expect(exportedSnapshot.npcs.definitions.find((entry) => entry.id === mockIds.npcs.rowan)?.areaId).toBe(
      mockIds.areas.crossroads,
    );
    expect(saveWriter.calls).toEqual(['auto']);
  });

  it('lets the Game Master mock schedule pressure events before they are legally triggerable', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.player.currentAreaId = mockIds.areas.archive;
    snapshot.map!.currentAreaId = mockIds.areas.archive;
    snapshot.events.history = snapshot.events.history.filter(
      (entry) => entry.eventId !== mockIds.events.marketPanic,
    );
    snapshot.events.director.pendingEventIds = [];
    snapshot.events.director.scheduledEvents = [];
    snapshot.events.director.worldTension = 58;

    const store = createGameStore(snapshot);
    const controller = new EventTriggerController({
      store,
      agents: createMockAgentSet(),
      now: () => '2026-03-25T12:20:00.000Z',
    });

    const result = await controller.evaluateDirectorEvent();

    expect(result).toBeTruthy();
    expect(
      store.getState().eventDirector.scheduledEvents.some(
        (entry) => entry.eventId === mockIds.events.marketPanic,
      ),
    ).toBe(true);
    expect(
      store.getState().eventHistory.some((entry) => entry.eventId === mockIds.events.marketPanic),
    ).toBe(false);
  });
});
