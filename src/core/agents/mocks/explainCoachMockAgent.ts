import {
  explainCoachInputSchema,
  explainCoachOutputSchema,
  type ExplainCoachInput,
  type ExplainCoachOutput,
} from '../../schemas';
import { mockTimeline } from '../../mocks';
import { formatEnemyTacticLabel } from '../../utils/displayLabels';

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
          `本轮流程中已有 ${completedQuestCount} 条任务线完成结算。`,
          `当前仍有 ${activeQuestCount} 条任务线处于进行中。`,
          `共有 ${input.eventHistory.length} 个世界事件影响了当前状态。`,
        ],
        explanations: [
          {
            type: 'quest',
            title: '任务压力仍然清晰可见',
            summary: `当前路线仍被 ${activeQuestCount} 条进行中的任务线持续推动。`,
            evidence: input.questProgress.map(
              (quest) => `${quest.questId}:${quest.status}`,
            ),
          },
          {
            type: 'combat',
            title: '战斗切换原因',
            summary: input.combat
              ? `当前战斗在第 ${input.combat.turn} 回合采用了${formatEnemyTacticLabel(input.combat.activeTactic)}战术。`
              : '生成回顾时不存在激活中的战斗状态。',
          },
          {
            type: 'event',
            title: '世界状态压力',
            summary: `最近事件历史长度为 ${input.eventHistory.length}。`,
          },
        ],
        suggestions: input.combat
          ? ['在敌人下一次切换战术前，先打断它的节奏。']
          : ['可以通过调试入口或任务控制器，把世界推进到更清晰的分支再做回顾。'],
      },
    };
  }
}
