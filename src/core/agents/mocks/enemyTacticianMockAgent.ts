import {
  enemyTacticianInputSchema,
  enemyTacticianOutputSchema,
  type CombatCommandAction,
  type EnemyTacticianInput,
  type EnemyTacticianOutput,
  type EnemyTacticType,
} from '../../schemas';
import { resolveEnemyCounterStrategyBias } from '../../rules';
import { formatEnemyTacticLabel } from '../../utils/displayLabels';

import type { EnemyTacticianAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const pickFirstAvailable = (
  pool: EnemyTacticType[],
  candidates: EnemyTacticType[],
) => candidates.find((candidate) => pool.includes(candidate)) ?? pool[0];

const getDominantAction = (
  actions: CombatCommandAction[],
): CombatCommandAction | null => {
  if (actions.length === 0) {
    return null;
  }

  const counts = new Map<CombatCommandAction, number>();
  let dominant: CombatCommandAction | null = null;
  let dominantCount = 0;

  actions.forEach((action) => {
    const nextCount = (counts.get(action) ?? 0) + 1;
    counts.set(action, nextCount);

    if (nextCount >= dominantCount) {
      dominant = action;
      dominantCount = nextCount;
    }
  });

  return dominant;
};

export class MockEnemyTacticianAgent
  extends ValidatedMockAgent<EnemyTacticianInput, EnemyTacticianOutput>
  implements EnemyTacticianAgent
{
  constructor() {
    super(
      'enemy-tactician',
      enemyTacticianInputSchema,
      enemyTacticianOutputSchema,
    );
  }

  protected execute(input: EnemyTacticianInput): EnemyTacticianOutput {
    const enemyHealthRatio =
      input.combatState.enemy.maxHp === 0
        ? 0
        : input.combatState.enemy.hp / input.combatState.enemy.maxHp;
    const playerHealthRatio =
      input.playerState.maxHp === 0
        ? 0
        : input.playerState.hp / input.playerState.maxHp;
    const dominantAction = getDominantAction(input.commonPlayerActions);
    const currentPhase = input.encounter.bossPhases?.find(
      (phase) => phase.id === (input.bossPhaseId ?? input.combatState.currentPhaseId),
    );
    const phaseBias = currentPhase?.tacticBias ?? [];
    const playerModelBias = resolveEnemyCounterStrategyBias(input.playerTags);
    const hasTrackedEnergy = typeof input.playerState.energy === 'number';
    const playerEnergy = input.playerState.energy ?? 0;
    const trapPressureActive =
      input.environmentState?.hazard === 'volatile' ||
      dominantAction === 'guard' ||
      dominantAction === 'heal' ||
      dominantAction === 'analyze';

    const candidateTactics: EnemyTacticType[] = [];
    const tacticReasons: Partial<Record<EnemyTacticType, string>> = {};

    if (hasTrackedEnergy && (playerEnergy <= 3 || dominantAction === 'special')) {
      candidateTactics.push('resource-lock');
      tacticReasons['resource-lock'] =
        '检测到玩家能量紧张或依赖特殊招式，优先通过资源压制打断节奏。';
    }

    if (trapPressureActive) {
      candidateTactics.push('trap');
      tacticReasons.trap =
        '玩家近期更偏防守或环境波动更强，布置陷阱更容易迫使其改变站位。';
    }

    if (
      dominantAction === 'attack' ||
      dominantAction === 'special' ||
      input.playerTags.includes('risky') ||
      input.playerTags.includes('combat')
    ) {
      candidateTactics.push('counter');
      tacticReasons.counter =
        '玩家近期以正面压制为主，使用反制战术更容易抓住进攻节奏。';
    }

    if (playerHealthRatio <= 0.45 || input.combatState.turn >= 5) {
      candidateTactics.push('aggressive');
      tacticReasons.aggressive =
        '战斗已进入压血或拖长阶段，敌方会提高压迫感争取尽快收尾。';
    }

    if (
      input.playerTags.includes('cautious') ||
      input.playerTags.includes('story') ||
      enemyHealthRatio <= 0.4
    ) {
      candidateTactics.push('defensive');
      tacticReasons.defensive =
        '玩家更偏稳妥推进，敌方保持防守与拖节奏会更容易建立优势。';
    }

    if (
      input.combatState.turn >= 3 ||
      input.playerTags.includes('social') ||
      phaseBias.includes('summon')
    ) {
      candidateTactics.push('summon');
      tacticReasons.summon =
        '当前局面适合通过召唤额外压力单位来分散玩家注意力。';
    }

    playerModelBias.tacticPriorities.forEach((tactic) => {
      candidateTactics.push(tactic);
      tacticReasons[tactic] ??=
        playerModelBias.reasons[0] ?? '系统根据玩家画像补充了额外战术偏置。';
    });

    const selectedTactic = pickFirstAvailable(input.encounter.tacticPool, [
      ...candidateTactics,
      ...phaseBias,
      'defensive',
      'aggressive',
    ]);

    const reason =
      tacticReasons[selectedTactic] ??
      `mock 战术代理根据当前遭遇配置，选择了${formatEnemyTacticLabel(selectedTactic)}。`;

    if (phaseBias.includes(selectedTactic)) {
      return {
        selectedTactic,
        reason: `${reason} 当前阶段本身就偏好这种战术。`,
      };
    }

    if (playerModelBias.tacticPriorities.includes(selectedTactic)) {
      return {
        selectedTactic,
        reason: `${reason} 这也符合当前玩家画像触发的反制优先级。`,
      };
    }

    return {
      selectedTactic,
      reason,
    };
  }
}
