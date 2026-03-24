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

export class MockGameMasterAgent
  extends ValidatedMockAgent<GameMasterInput, GameMasterOutput>
  implements GameMasterAgent
{
  constructor() {
    super('game-master', gameMasterInputSchema, gameMasterOutputSchema);
  }

  protected execute(input: GameMasterInput): GameMasterOutput {
    if (
      input.currentAreaId === mockIds.areas.crossroads &&
      !hasTriggered(mockIds.events.ashfallWarning, input.triggeredEvents)
    ) {
      return {
        eventToTrigger: mockIds.events.ashfallWarning,
        pacingNote: '先用灰烬预警这一拍建立山谷危机感。',
      };
    }

    if (
      input.currentAreaId === mockIds.areas.archive &&
      input.activeQuestIds.includes(mockIds.quests.main) &&
      !hasTriggered(mockIds.events.archiveEchoes, input.triggeredEvents)
    ) {
      return {
        eventToTrigger: mockIds.events.archiveEchoes,
        pacingNote: '主线一旦激活，就抬高秘库谜团的压力。',
      };
    }

    if (
      input.currentAreaId === mockIds.areas.sanctum &&
      input.playerTags.includes('risky')
    ) {
      return {
        eventToTrigger: mockIds.events.wardenCountermeasure,
        pacingNote: '玩家在圣所采取高风险打法时，应触发防御清扫。',
      };
    }

    return {
      pacingNote: '先稳住当前节奏，让探索留一点呼吸空间，再推进下一个事件。',
    };
  }
}
