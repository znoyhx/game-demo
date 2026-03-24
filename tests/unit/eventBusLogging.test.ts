import { describe, expect, it } from 'vitest';

import { createGameEventBus } from '../../src/core/events/domainEvents';
import {
  GameLogger,
  attachDomainEventLogging,
  createGameLogStore,
} from '../../src/core/logging';

describe('typed event bus and logging', () => {
  it('emits typed payloads and event envelopes with timestamps', () => {
    const eventBus = createGameEventBus(() => '2026-03-23T02:00:00.000Z');
    const seenPayloads: Array<{ areaId: string }> = [];
    const seenEvents: string[] = [];

    eventBus.subscribe('AREA_ENTERED', (payload) => {
      seenPayloads.push({ areaId: payload.areaId });
    });
    eventBus.subscribeAll((event) => {
      seenEvents.push(`${event.name}:${event.createdAt}`);
    });

    const envelope = eventBus.emit('AREA_ENTERED', {
      areaId: 'area:test',
      previousAreaId: 'area:before',
      unlockedAreaIds: ['area:test'],
    });

    expect(seenPayloads).toEqual([{ areaId: 'area:test' }]);
    expect(seenEvents).toEqual(['AREA_ENTERED:2026-03-23T02:00:00.000Z']);
    expect(envelope.payload.unlockedAreaIds).toContain('area:test');
  });

  it('records domain events into debug/review-consumable logs', () => {
    const eventBus = createGameEventBus(() => '2026-03-23T02:05:00.000Z');
    const logStore = createGameLogStore();
    const logger = new GameLogger(logStore);

    attachDomainEventLogging(eventBus, logger);

    eventBus.emit('NPC_INTERACTED', {
      npcId: 'npc:test',
      trustDelta: 3,
      relationshipDelta: 2,
      disposition: 'friendly',
      unlockedQuestIds: ['quest:test'],
    });

    const entries = logStore.getState().entries;

    expect(entries).toHaveLength(2);
    expect(entries[0]?.kind).toBe('npc-interaction');
    expect(entries[1]?.kind).toBe('domain-event');
    expect(entries[0]?.summary).toBe('已记录一次角色互动结果。');
    expect(entries[0] && 'npcId' in entries[0] ? entries[0].npcId : null).toBe('npc:test');
    expect(entries[1] && 'eventName' in entries[1] ? entries[1].eventName : null).toBe(
      'NPC_INTERACTED',
    );
  });

  it('records agent decisions and explanation inputs explicitly', () => {
    const logStore = createGameLogStore();
    const logger = new GameLogger(logStore);

    logger.recordAgentDecision({
      agentId: 'npc-brain',
      createdAt: '2026-03-23T02:10:00.000Z',
      inputSummary: '角色互动输入',
      outputSummary: '角色互动输出',
      input: { npcId: 'npc:test' },
      output: { npcReply: 'Stay alert.' },
    });
    logger.recordExplanationInput({
      createdAt: '2026-03-23T02:11:00.000Z',
      encounterId: 'encounter:test',
      questIds: ['quest:test'],
      eventIds: ['event:test'],
      playerTags: ['story'],
      input: { questCount: 1 },
    });

    const entries = logStore.getState().entries;

    expect(entries[0]?.kind).toBe('explanation-input');
    expect(entries[1]?.kind).toBe('agent-decision');
    expect(entries[1]?.summary).toContain('角色思维代理');
    expect(entries[1] && 'agentId' in entries[1] ? entries[1].agentId : null).toBe('npc-brain');
  });
});
