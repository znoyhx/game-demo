import {
  questDesignerInputSchema,
  questDesignerOutputSchema,
  type QuestDesignerInput,
  type QuestDesignerOutput,
} from '../../schemas';
import { mockQuestDefinitions } from '../../mocks';

import type { QuestDesignerAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

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
      .slice(0, input.questCount.main);
    const sideQuests = mockQuestDefinitions
      .filter((quest) => quest.type === 'side')
      .slice(0, input.questCount.side);

    return {
      quests: [...mainQuests, ...sideQuests].map((quest) => ({
        ...quest,
        description:
          input.world.summary.mode === 'story'
            ? `${quest.description} Narrative beats are emphasized in this world variant.`
            : quest.description,
      })),
    };
  }
}
