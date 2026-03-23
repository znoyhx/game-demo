import {
  questDesignerInputSchema,
  questDesignerOutputSchema,
  type QuestDesignerInput,
  type QuestDesignerOutput,
} from '../../schemas';
import { mockQuestDefinitions } from '../../mocks';

import type { QuestDesignerAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const toQuestTitle = (goal: string) => {
  const trimmed = goal.trim();

  if (!trimmed) {
    return 'Stabilize the world';
  }

  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`;
};

export class MockQuestDesignerAgent
  extends ValidatedMockAgent<QuestDesignerInput, QuestDesignerOutput>
  implements QuestDesignerAgent
{
  constructor() {
    super('quest-designer', questDesignerInputSchema, questDesignerOutputSchema);
  }

  protected execute(input: QuestDesignerInput): QuestDesignerOutput {
    const mainQuests = mockQuestDefinitions
      .filter((quest) => quest.type === 'main')
      .slice(0, input.questCount.main)
      .map((quest) => ({
        ...quest,
        title: toQuestTitle(input.gameGoal),
        description: `${input.storyPremise} Main route: ${quest.description}`,
      }));
    const sideQuests = mockQuestDefinitions
      .filter((quest) => quest.type === 'side')
      .slice(0, input.questCount.side)
      .map((quest, index) => ({
        ...quest,
        description: `${quest.description} This optional route reinforces ${input.world.summary.mode} play in region ${
          input.areas[index % input.areas.length]?.name ?? 'the current zone'
        }.${input.learningGoal ? ` Learning hook: ${input.learningGoal}.` : ''}`,
      }));

    return {
      quests: [...mainQuests, ...sideQuests],
    };
  }
}
