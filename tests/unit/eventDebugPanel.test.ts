import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { EventDebugController } from '../../src/core/controllers/eventDebugController';
import { EventTriggerController } from '../../src/core/controllers/eventTriggerController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';
import { EventDebugPanel } from '../../src/components/debug/EventDebugPanel';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

const fixedNow = () => '2026-03-25T14:00:00.000Z';

const buildController = (snapshot = structuredClone(mockSaveSnapshot)) => {
  const store = createGameStore(snapshot);
  const saveWriter = new SaveWriterSpy();
  const eventController = new EventTriggerController({
    store,
    agents: createMockAgentSet(),
    saveController: saveWriter,
    now: fixedNow,
  });

  return new EventDebugController({
    store,
    eventController,
    saveController: saveWriter,
    now: fixedNow,
  });
};

describe('event debug panel', () => {
  it('renders a blocked event with natural trigger blockers and history options', () => {
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

    const controller = buildController(snapshot);
    const debugSnapshot = controller.getDebugSnapshot();
    const selectedEvent = debugSnapshot.events.find(
      (event) => event.eventId === mockIds.events.earlyBossSighted,
    );

    expect(selectedEvent).toBeTruthy();
    expect(selectedEvent?.naturallyTriggerable).toBe(false);
    expect(selectedEvent?.naturalReasons.length).toBeGreaterThan(0);

    const markup = renderToStaticMarkup(
      createElement(EventDebugPanel, {
        snapshot: debugSnapshot,
        selectedEventId: mockIds.events.earlyBossSighted,
        selectedHistoryIndex: debugSnapshot.history[0]?.index ?? null,
        latestOutcome: null,
        busyActionId: null,
        statusMessage: '已准备好进行事件调试。',
        onSelectEvent: () => {},
        onSelectHistoryIndex: () => {},
        onTriggerSelectedEvent: () => {},
        onReplaySelectedHistory: () => {},
        onToggleRandomness: () => {},
      }),
    );

    expect(markup).toContain(selectedEvent?.title ?? '');
    expect(markup).toContain(selectedEvent?.naturalReasons[0] ?? '');
    expect(markup).toContain(debugSnapshot.history[0]?.title ?? '');
    expect(markup).toContain('已准备好进行事件调试。');
  });

  it('renders deterministic replay outcomes with the original history reference and change summary', async () => {
    const controller = buildController();

    await controller.setRandomnessDisabled(true);
    const outcome = await controller.replayEvent(0);
    const debugSnapshot = controller.getDebugSnapshot();

    expect(outcome).toBeTruthy();
    expect(outcome?.directorAfter.randomnessDisabled).toBe(true);
    expect(outcome?.changeSummary.length).toBeGreaterThan(0);
    expect(outcome?.replayedFromTriggeredAt).toBeTruthy();

    const markup = renderToStaticMarkup(
      createElement(EventDebugPanel, {
        snapshot: debugSnapshot,
        selectedEventId: outcome?.eventId ?? null,
        selectedHistoryIndex: 0,
        latestOutcome: outcome,
        busyActionId: null,
        statusMessage: '已按稳定模式完成历史回放。',
        onSelectEvent: () => {},
        onSelectHistoryIndex: () => {},
        onTriggerSelectedEvent: () => {},
        onReplaySelectedHistory: () => {},
        onToggleRandomness: () => {},
      }),
    );

    expect(markup).toContain(outcome?.title ?? '');
    expect(markup).toContain(outcome?.triggeredAt ?? '');
    expect(markup).toContain(outcome?.replayedFromTriggeredAt ?? '');
    expect(markup).toContain(outcome?.changeSummary[0] ?? '');
    expect(markup).toContain('已按稳定模式完成历史回放。');
  });
});
