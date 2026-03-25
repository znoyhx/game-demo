import {
  enemyTacticianInputSchema,
  enemyTacticianOutputSchema,
  type CombatCommandAction,
  type EnemyTacticianInput,
  type EnemyTacticianOutput,
  type EnemyTacticType,
} from '../../schemas';
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
      input.playerState.maxHp === 0 ? 0 : input.playerState.hp / input.playerState.maxHp;
    const dominantAction = getDominantAction(input.commonPlayerActions);
    const currentPhase = input.encounter.bossPhases?.find(
      (phase) => phase.id === (input.bossPhaseId ?? input.combatState.currentPhaseId),
    );
    const phaseBias = currentPhase?.tacticBias ?? [];
    const hasTrackedEnergy = typeof input.playerState.energy === 'number';
    const playerEnergy = input.playerState.energy ?? 0;
    const dominantIsGuard = dominantAction === 'guard';
    const dominantIsHeal = dominantAction === 'heal';
    const dominantIsAnalyze = dominantAction === 'analyze';
    const dominantIsSpecial = dominantAction === 'special';
    const trapPressureActive =
      input.environmentState?.hazard === 'volatile' ||
      dominantIsGuard ||
      dominantIsHeal ||
      dominantIsAnalyze;

    const candidateTactics: EnemyTacticType[] = [];
    const tacticReasons: Partial<Record<EnemyTacticType, string>> = {};

    if (
      hasTrackedEnergy &&
      (playerEnergy <= 3 || (!trapPressureActive && dominantIsSpecial))
    ) {
      candidateTactics.push('resource-lock');
      tacticReasons['resource-lock'] =
        '玩家资源储备正在见底或高度依赖技能指令，优先封锁能量回路';
    }

    if (trapPressureActive) {
      candidateTactics.push('trap');
      tacticReasons.trap =
        '战场环境或玩家节奏容易诱导停顿，适合布置陷阱和牵引动作';
    }

    if (
      dominantAction === 'attack' ||
      dominantAction === 'special' ||
      input.playerTags.includes('risky') ||
      input.playerTags.includes('combat')
    ) {
      candidateTactics.push('counter');
      tacticReasons.counter =
        '玩家近期偏好正面强压，适合用反制手段惩罚常用输出节奏';
    }

    if (playerHealthRatio <= 0.45 || input.combatState.turn >= 5) {
      candidateTactics.push('aggressive');
      tacticReasons.aggressive =
        '玩家生命已压低或战斗拖长，应切换到压制强攻尽快逼出结果';
    }

    if (
      input.playerTags.includes('cautious') ||
      input.playerTags.includes('story') ||
      enemyHealthRatio <= 0.4
    ) {
      candidateTactics.push('defensive');
      tacticReasons.defensive =
        '当前更适合用防守消耗拖住节奏，等待下一次明确破绽';
    }

    if (
      input.combatState.turn >= 3 ||
      input.playerTags.includes('social') ||
      phaseBias.includes('summon')
    ) {
      candidateTactics.push('summon');
      tacticReasons.summon =
        '已进入中后段回合，召唤支援能制造额外压迫与换位机会';
    }

    const selectedTactic = pickFirstAvailable(input.encounter.tacticPool, [
      ...candidateTactics,
      ...phaseBias,
      'defensive',
      'aggressive',
    ]);

    const reason =
      tacticReasons[selectedTactic] ??
      `mock 战术代理根据当前遭遇配置，选择了${formatEnemyTacticLabel(selectedTactic)}。`;

    return {
      selectedTactic,
      reason:
        phaseBias.includes(selectedTactic)
          ? `${reason} 当前首领阶段对这套战术有额外偏好。`
          : reason,
    };
  }
}
