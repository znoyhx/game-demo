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
        pacingNote: 'Open with the ashfall pressure beat to establish the valley threat.',
      };
    }

    if (
      input.currentAreaId === mockIds.areas.archive &&
      input.activeQuestIds.includes(mockIds.quests.main) &&
      !hasTriggered(mockIds.events.archiveEchoes, input.triggeredEvents)
    ) {
      return {
        eventToTrigger: mockIds.events.archiveEchoes,
        pacingNote: 'Escalate archive mystery once the main quest is active.',
      };
    }

    if (
      input.currentAreaId === mockIds.areas.sanctum &&
      input.playerTags.includes('risky')
    ) {
      return {
        eventToTrigger: mockIds.events.wardenCountermeasure,
        pacingNote: 'High-risk play in the sanctum should wake the defensive sweep.',
      };
    }

    return {
      pacingNote: 'Hold the current beat and let exploration breathe before the next event.',
    };
  }
}
