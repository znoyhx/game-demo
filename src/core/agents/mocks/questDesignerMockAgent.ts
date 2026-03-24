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
    return '稳定世界秩序';
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
        description: `${input.storyPremise} 主线目标：${quest.description}`,
      }));
    const sideQuests = mockQuestDefinitions
      .filter((quest) => quest.type === 'side')
      .slice(0, input.questCount.side)
      .map((quest, index) => ({
        ...quest,
        description: `${quest.description} 这条可选路线会在${
          input.areas[index % input.areas.length]?.name ?? '当前区域'
        }进一步强化${{
          story: '剧情',
          exploration: '探索',
          combat: '战斗',
          hybrid: '混合',
        }[input.world.summary.mode]}玩法。${
          input.learningGoal ? ` 学习提示：${input.learningGoal}。` : ''
        }`,
      }));
    const supportQuests = mockQuestDefinitions
      .filter(
        (quest) =>
          quest.type === 'tutorial' ||
          quest.type === 'hidden' ||
          quest.type === 'dynamic',
      )
      .map((quest) => ({
        ...quest,
        description: `${quest.description} 该任务会与${input.gameGoal}形成额外的结构化支线或动态反馈。`,
      }));

    return {
      quests: [...supportQuests, ...mainQuests, ...sideQuests],
    };
  }
}
