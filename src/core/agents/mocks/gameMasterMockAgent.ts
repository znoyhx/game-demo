import {
  gameMasterInputSchema,
  gameMasterOutputSchema,
  type GameMasterInput,
  type GameMasterOutput,
} from '../../schemas';
import { mockIds } from '../../mocks';

import type { GameMasterAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const hasTriggered = (
  eventId: string,
  triggeredEvents: GameMasterInput['triggeredEvents'],
) => triggeredEvents.some((entry) => entry.eventId === eventId);

const isAvailable = (
  eventId: string,
  input: GameMasterInput,
) =>
  input.availableEvents.some((event) => event.id === eventId) &&
  !hasTriggered(eventId, input.triggeredEvents);

export class MockGameMasterAgent
  extends ValidatedMockAgent<GameMasterInput, GameMasterOutput>
  implements GameMasterAgent
{
  constructor() {
    super('game-master', gameMasterInputSchema, gameMasterOutputSchema);
  }

  protected execute(input: GameMasterInput): GameMasterOutput {
    const scheduledEvents: GameMasterOutput['scheduledEvents'] = [];

    if (
      input.currentAreaId === mockIds.areas.crossroads &&
      isAvailable(mockIds.events.ashfallWarning, input)
    ) {
      return {
        eventToTrigger: mockIds.events.ashfallWarning,
        scheduledEvents,
        pacingNote: '先用灰烬预警建立前哨危机感，再逐步压缩补给空间。',
      };
    }

    if (
      input.currentAreaId === mockIds.areas.archive &&
      input.activeQuestIds.includes(mockIds.quests.main) &&
      isAvailable(mockIds.events.archiveEchoes, input)
    ) {
      return {
        eventToTrigger: mockIds.events.archiveEchoes,
        scheduledEvents,
        pacingNote: '主线推进到秘库后，优先让隐藏线索浮出水面。',
        worldTensionDelta: 4,
      };
    }

    if (
      input.currentAreaId === mockIds.areas.sanctum &&
      input.playerTags.includes('risky') &&
      isAvailable(mockIds.events.wardenCountermeasure, input)
    ) {
      return {
        eventToTrigger: mockIds.events.wardenCountermeasure,
        scheduledEvents,
        pacingNote: '玩家在圣所采取高风险打法时，应立即抬高封锁与反制压力。',
        worldTensionDelta: 8,
      };
    }

    if (
      input.worldTension >= 55 &&
      isAvailable(mockIds.events.marketPanic, input) &&
      !input.pendingEvents.some((event) => event.eventId === mockIds.events.marketPanic)
    ) {
      scheduledEvents.push({
        eventId: mockIds.events.marketPanic,
        scheduledBy: 'game-master',
        reason: '前哨市场已经感受到张力，应提前安排一次价格波动。',
      });
    }

    if (
      input.currentAreaId === mockIds.areas.archive &&
      input.worldTension >= 60 &&
      isAvailable(mockIds.events.borderSkirmish, input) &&
      !input.pendingEvents.some((event) => event.eventId === mockIds.events.borderSkirmish)
    ) {
      scheduledEvents.push({
        eventId: mockIds.events.borderSkirmish,
        scheduledBy: 'game-master',
        reason: '秘库线张力过高，应该安排阵营冲突把局势往前推。',
      });
    }

    if (
      input.currentAreaId === mockIds.areas.archive &&
      input.playerTags.includes('risky') &&
      input.worldTension >= 55 &&
      isAvailable(mockIds.events.earlyBossSighted, input)
    ) {
      return {
        eventToTrigger: mockIds.events.earlyBossSighted,
        scheduledEvents,
        pacingNote: '玩家持续冒进时，提前让首领显影，制造明显压迫感。',
        worldTensionDelta: 6,
      };
    }

    return {
      scheduledEvents,
      pacingNote:
        scheduledEvents.length > 0
          ? '导演已先行安排后续事件，当前节奏先保持一拍呼吸。'
          : '先稳住当前节奏，让探索留一点呼吸空间，再推进下一个事件。',
    };
  }
}
