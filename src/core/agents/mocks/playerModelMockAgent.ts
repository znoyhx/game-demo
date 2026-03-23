import {
  playerModelInputSchema,
  playerModelOutputSchema,
  type PlayerModelInput,
  type PlayerModelOutput,
} from '../../schemas';

import type { PlayerModelAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

export class MockPlayerModelAgent
  extends ValidatedMockAgent<PlayerModelInput, PlayerModelOutput>
  implements PlayerModelAgent
{
  constructor() {
    super('player-model', playerModelInputSchema, playerModelOutputSchema);
  }

  protected execute(input: PlayerModelInput): PlayerModelOutput {
    const tags = new Set<PlayerModelOutput['tags'][number]>();
    const rationale: string[] = [];

    if (new Set(input.recentAreaVisits).size >= 2) {
      tags.add('exploration');
      rationale.push('The player keeps rotating through multiple areas.');
    }

    if (input.npcInteractionCount >= 3 || input.recentQuestChoices.length > 0) {
      tags.add('story');
      rationale.push('Dialogue and quest branch interactions remain a major driver.');
    }

    if (input.combatSummary) {
      tags.add('combat');
      rationale.push('A recent combat summary is present, so the player has engaged the tactical loop.');
      if (input.combatSummary.activeTactic === 'counter') {
        tags.add('risky');
        rationale.push('The player is still pressing through enemy counterplay.');
      }
    }

    if (tags.size === 0) {
      tags.add('cautious');
      rationale.push('The available signals are sparse, so the model defaults to cautious.');
    }

    return {
      tags: Array.from(tags),
      rationale,
    };
  }
}
