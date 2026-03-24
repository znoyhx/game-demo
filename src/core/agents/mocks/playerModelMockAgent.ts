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
      rationale.push('玩家持续在多个区域之间切换探索。');
    }

    if (input.npcInteractionCount >= 3 || input.recentQuestChoices.length > 0) {
      tags.add('story');
      rationale.push('对话与任务分支互动仍然是主要驱动力。');
    }

    if (input.combatSummary) {
      tags.add('combat');
      rationale.push('最近存在战斗摘要，说明玩家已经进入了战术循环。');
      if (input.combatSummary.activeTactic === 'counter') {
        tags.add('risky');
        rationale.push('即使敌人进入反击节奏，玩家仍在持续施压。');
      }
    }

    if (tags.size === 0) {
      tags.add('cautious');
      rationale.push('当前可用信号较少，因此模型默认给出谨慎判断。');
    }

    return {
      tags: Array.from(tags),
      rationale,
    };
  }
}
