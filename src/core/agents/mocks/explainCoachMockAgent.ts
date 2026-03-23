import {
  explainCoachInputSchema,
  explainCoachOutputSchema,
  type ExplainCoachInput,
  type ExplainCoachOutput,
} from '../../schemas';
import { mockTimeline } from '../../mocks';

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
    const activeQuestCount = input.questProgress.filter(
      (quest) => quest.status === 'active',
    ).length;
    const completedQuestCount = input.questProgress.filter(
      (quest) => quest.status === 'completed',
    ).length;

    return {
      review: {
        generatedAt: mockTimeline.reviewGeneratedAt,
        encounterId: input.combat?.encounterId,
        playerTags: input.player.profileTags,
        keyEvents: [
          `${completedQuestCount} quest threads have already resolved in this run.`,
          `${activeQuestCount} quest threads are still active.`,
          `${input.eventHistory.length} world events influenced the current state.`,
        ],
        explanations: [
          {
            type: 'quest',
            title: 'Quest pressure remains visible',
            summary: `There are ${activeQuestCount} active quest threads driving the current route.`,
            evidence: input.questProgress.map(
              (quest) => `${quest.questId}:${quest.status}`,
            ),
          },
          {
            type: 'combat',
            title: 'Combat rationale',
            summary: input.combat
              ? `The current tactic is ${input.combat.activeTactic} on turn ${input.combat.turn}.`
              : 'No active combat state was present when the review was generated.',
          },
          {
            type: 'event',
            title: 'World state pressure',
            summary: `Recent event history length: ${input.eventHistory.length}.`,
          },
        ],
        suggestions: input.combat
          ? ['Break the enemy rhythm before the next tactic pivot.']
          : ['Use the debug or quest controllers to push the world into a sharper branch for review.'],
      },
    };
  }
}
