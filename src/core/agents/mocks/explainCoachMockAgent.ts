import {
  explainCoachInputSchema,
  explainCoachOutputSchema,
  type ExplainCoachInput,
  type ExplainCoachOutput,
} from '../../schemas';
import { mockTimeline } from '../../mocks';
import { buildReviewPayload } from '../../rules';

import type { ExplainCoachAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

export class MockExplainCoachAgent
  extends ValidatedMockAgent<ExplainCoachInput, ExplainCoachOutput>
  implements ExplainCoachAgent
{
  constructor() {
    super(
      'explain-coach',
      explainCoachInputSchema,
      explainCoachOutputSchema,
    );
  }

  protected execute(input: ExplainCoachInput): ExplainCoachOutput {
    return {
      review: buildReviewPayload({
        generatedAt: mockTimeline.reviewGeneratedAt,
        playerTags: input.player.profileTags,
        encounter: input.encounter,
        combat: input.combat,
        combatHistory: input.combatHistory,
        questProgress: input.questProgress,
        eventHistory: input.eventHistory,
      }),
    };
  }
}
