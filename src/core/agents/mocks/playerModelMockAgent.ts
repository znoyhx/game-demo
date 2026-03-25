import {
  playerModelInputSchema,
  playerModelOutputSchema,
  type PlayerModelInput,
  type PlayerModelOutput,
} from '../../schemas';

import type { PlayerModelAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const buildRiskForecast = (tags: PlayerModelOutput['tags']) => {
  if (tags.includes('risky') || tags.includes('combat')) {
    return '你近期更偏向正面压制，敌人之后更可能针对你的爆发节奏进行反制。';
  }

  if (tags.includes('speedrun')) {
    return '你推进很快，若继续跳过关键互动，后续可能会缺少支线信息或补给。';
  }

  return '当前风险整体可控，但系统仍会继续追踪你的选择并动态调整反馈。';
};

const buildStuckPoint = (tags: PlayerModelOutput['tags']) => {
  if (tags.includes('social') || tags.includes('story')) {
    return '若主线暂时卡住，优先去找关键 NPC 复盘对话或领取新的任务分支。';
  }

  if (tags.includes('exploration')) {
    return '若推进受阻，先搜索当前区域剩余互动点或回看最近探索过的地图节点。';
  }

  if (tags.includes('combat')) {
    return '若战斗频繁失利，先观察敌方战术切换，再决定是防守回气还是继续压制。';
  }

  return '建议在探索、交流和战斗之间交替推进，帮助系统更快识别你的稳定偏好。';
};

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
    const uniqueAreas = new Set(input.recentAreaVisits).size;
    const aggressiveActions = input.recentCombatActions.filter(
      (action) => action === 'attack' || action === 'special',
    ).length;
    const carefulActions = input.recentCombatActions.filter((action) =>
      ['guard', 'heal', 'analyze', 'retreat'].includes(action),
    ).length;
    const socialIntents = input.recentNpcInteractionIntents.filter((intent) =>
      ['greet', 'trade', 'persuade'].includes(intent),
    ).length;
    const storyIntents = input.recentNpcInteractionIntents.filter((intent) =>
      ['ask', 'quest'].includes(intent),
    ).length;

    if (uniqueAreas >= 3 || input.signalWeights.exploration >= 3) {
      tags.add('exploration');
      rationale.push('你近期持续切换区域并清理互动点，表现出明显的探索倾向。');
    }

    if (
      input.recentCombatActions.length >= 2 ||
      input.combatHistory.length > 0 ||
      input.signalWeights.combat >= 3
    ) {
      tags.add('combat');
      rationale.push('你会主动通过战斗操作推动局势，系统将你识别为战斗驱动型玩家。');
    }

    if (input.npcInteractionCount >= 3 || socialIntents >= 2) {
      tags.add('social');
      rationale.push('你近期频繁与 NPC 互动，说明你愿意通过关系和交流推进内容。');
    }

    if (
      input.recentQuestChoices.length > 0 ||
      input.completedQuestCount > 0 ||
      storyIntents >= 1
    ) {
      tags.add('story');
      rationale.push('你会主动处理任务分支和剧情线索，说明叙事内容对你很重要。');
    }

    if (
      input.completedQuestCount >= 2 ||
      input.signalWeights.speedrun >= 4 ||
      (input.activeQuestCount > input.npcInteractionCount && uniqueAreas >= 2)
    ) {
      tags.add('speedrun');
      rationale.push('你推进节奏较快，常优先处理关键目标而非慢速铺垫。');
    }

    if (carefulActions + input.signalWeights.cautious >= aggressiveActions + input.signalWeights.risky) {
      if (carefulActions > 0 || input.signalWeights.cautious >= 2) {
        tags.add('cautious');
        rationale.push('你近期更偏向观察、恢复与稳妥推进，因此被识别为谨慎型。');
      }
    } else if (aggressiveActions > 0 || input.signalWeights.risky >= 2) {
      tags.add('risky');
      rationale.push('你近期更常用主动压制和高风险分支，因此被识别为冒险型。');
    }

    if (tags.size === 0) {
      tags.add('cautious');
      rationale.push('系统尚未观察到足够多的强特征行为，暂时将你视为稳妥推进型玩家。');
    }

    const orderedTags = Array.from(tags);

    return {
      tags: orderedTags,
      rationale: rationale.slice(0, 4),
      riskForecast: buildRiskForecast(orderedTags),
      stuckPoint: buildStuckPoint(orderedTags),
    };
  }
}
