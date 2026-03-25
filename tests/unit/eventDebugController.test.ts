import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { EventDebugController } from '../../src/core/controllers/eventDebugController';
import { EventTriggerController } from '../../src/core/controllers/eventTriggerController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

const fixedNow = () => '2026-03-25T14:00:00.000Z';

const buildControllers = (snapshot = structuredClone(mockSaveSnapshot)) => {
  const store = createGameStore(snapshot);
  const saveWriter = new SaveWriterSpy();
  const eventController = new EventTriggerController({
    store,
    agents: createMockAgentSet(),
    saveController: saveWriter,
    now: fixedNow,
  });
  const eventDebugController = new EventDebugController({
    store,
    eventController,
    saveController: saveWriter,
    now: fixedNow,
  });

  return {
    store,
    saveWriter,
    eventDebugController,
  };
};

describe('event debug controller', () => {
  it('manually triggers a blocked event through debug controls and records the resulting state changes', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.events.history = snapshot.events.history.filter(
      (entry) => entry.eventId !== mockIds.events.earlyBossSighted,
    );
    if (!snapshot.playerModel) {
      throw new Error('Expected player model fixture to be present.');
    }
    snapshot.playerModel.tags = snapshot.playerModel.tags.filter((tag) => tag !== 'risky');
    snapshot.player.profileTags = snapshot.player.profileTags.filter(
      (tag) => tag !== 'risky',
    );
    snapshot.events.director.worldTension = 20;

    const { store, saveWriter, eventDebugController } = buildControllers(snapshot);
    const result = await eventDebugController.triggerEvent(
      mockIds.events.earlyBossSighted,
    );

    expect(result?.actualSource).toBe('debug');
    expect(result?.naturalEvaluationOk).toBe(false);
    expect(result?.naturalReasons.length).toBeGreaterThan(0);
    expect(
      result?.changeSummary.some((line) => line.includes('首领现身')),
    ).toBe(true);
    expect(store.getState().npcDefinitionsById[mockIds.npcs.ashWarden]?.areaId).toBe(
      mockIds.areas.archive,
    );
    const latestEntry =
      store.getState().eventHistory[store.getState().eventHistory.length - 1];

    expect(latestEntry).toMatchObject({
      eventId: mockIds.events.earlyBossSighted,
      source: 'debug',
    });
    expect(store.getState().debugTools.forcedEventId).toBe(
      mockIds.events.earlyBossSighted,
    );
    expect(saveWriter.calls).toEqual(['debug']);
  });

  it('replays the same history entry deterministically after randomness is disabled', async () => {
    const runReplay = async () => {
      const { store, saveWriter, eventDebugController } = buildControllers();
      await eventDebugController.setRandomnessDisabled(true);
      const result = await eventDebugController.replayEvent(0);

      return {
        result,
        lyraTrust: store.getState().npcStatesById[mockIds.npcs.lyra]?.trust,
        director: structuredClone(store.getState().eventDirector),
        calls: saveWriter.calls,
      };
    };

    const firstRun = await runReplay();
    const secondRun = await runReplay();

    expect(firstRun.result?.mode).toBe('history-replay');
    expect(firstRun.result?.directorAfter.randomnessDisabled).toBe(true);
    expect(firstRun.result?.changeSummary).toEqual(secondRun.result?.changeSummary);
    expect(firstRun.result?.directorAfter).toEqual(secondRun.result?.directorAfter);
    expect(firstRun.lyraTrust).toBe(secondRun.lyraTrust);
    expect(firstRun.director).toEqual(secondRun.director);
    expect(firstRun.calls).toEqual(['debug', 'debug']);
    expect(secondRun.calls).toEqual(['debug', 'debug']);
  });
});
