import type {
  CombatEncounterDefinition,
  CombatLogEntry,
  CombatResult,
  CombatState,
  EnemyTacticType,
} from '../schemas';

import { failRule, passRule, type RuleResult } from './ruleResult';

export const allowedCombatActions = [
  'attack',
  'guard',
  'heal',
  'analyze',
  'special',
  'retreat',
] as const;

export type CombatActionType = (typeof allowedCombatActions)[number];

const combatActionLabels: Record<CombatActionType, string> = {
  attack: '攻击',
  guard: '防御',
  heal: '治疗',
  analyze: '解析',
  special: '特技',
  retreat: '撤退',
};

const enemyTacticLabels: Record<EnemyTacticType, string> = {
  aggressive: '强攻',
  defensive: '防守',
  counter: '反击',
  trap: '陷阱',
  summon: '召唤',
  'resource-lock': '资源封锁',
};

const tacticDamageTable: Record<EnemyTacticType, number> = {
  aggressive: 9,
  defensive: 4,
  counter: 7,
  trap: 6,
  summon: 5,
  'resource-lock': 5,
};

const playerDamageTable: Record<CombatActionType, number> = {
  attack: 12,
  guard: 0,
  heal: 0,
  analyze: 4,
  special: 16,
  retreat: 0,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export interface CombatLegalityResult extends RuleResult {
  actionType: string;
  reasons: string[];
}

export const evaluateCombatActionLegality = (
  combatState: CombatState,
  actionType: string,
): CombatLegalityResult => {
  const reasons: string[] = [];

  if (combatState.result) {
    reasons.push('这场战斗遭遇已经结算完成');
  }

  if (!allowedCombatActions.includes(actionType as CombatActionType)) {
    reasons.push(`不支持的战斗动作：${actionType}`);
  }

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      actionType,
      reasons,
    };
  }

  return {
    ...passRule('战斗动作合法'),
    actionType,
    reasons: ['战斗动作合法'],
  };
};

export interface CombatPhaseResult {
  previousPhaseId?: string;
  nextPhaseId?: string;
  changed: boolean;
}

export const resolveCombatPhase = (
  encounter: CombatEncounterDefinition,
  combatState: CombatState,
): CombatPhaseResult => {
  const phases = encounter.bossPhases ?? [];

  if (phases.length === 0) {
    return {
      previousPhaseId: combatState.currentPhaseId,
      nextPhaseId: combatState.currentPhaseId,
      changed: false,
    };
  }

  let nextPhaseId = phases[0]?.id;

  for (const phase of phases) {
    const thresholdSatisfied =
      phase.thresholdType === 'turn'
        ? combatState.turn >= phase.thresholdValue
        : combatState.enemy.hp <= phase.thresholdValue;

    if (thresholdSatisfied) {
      nextPhaseId = phase.id;
    }
  }

  return {
    previousPhaseId: combatState.currentPhaseId,
    nextPhaseId,
    changed: combatState.currentPhaseId !== nextPhaseId,
  };
};

export interface CombatRoundResult extends RuleResult {
  combatState: CombatState;
  legality: CombatLegalityResult;
  phase: CombatPhaseResult;
  result?: CombatResult;
  playerDamageTaken: number;
  enemyDamageTaken: number;
}

export const resolveCombatRound = (options: {
  encounter: CombatEncounterDefinition;
  combatState: CombatState;
  playerActionType: CombatActionType;
  enemyTactic: EnemyTacticType;
}): CombatRoundResult => {
  const legality = evaluateCombatActionLegality(
    options.combatState,
    options.playerActionType,
  );

  if (!legality.ok) {
    return {
      ...failRule(legality.reason ?? '战斗动作不合法'),
      legality,
      phase: {
        previousPhaseId: options.combatState.currentPhaseId,
        nextPhaseId: options.combatState.currentPhaseId,
        changed: false,
      },
      combatState: options.combatState,
      playerDamageTaken: 0,
      enemyDamageTaken: 0,
    };
  }

  if (options.playerActionType === 'retreat') {
    const escapeState: CombatState = {
      ...options.combatState,
      result: 'escape',
      logs: [
        ...options.combatState.logs,
        {
          turn: options.combatState.turn,
          phaseId: options.combatState.currentPhaseId,
          activeTactic: options.enemyTactic,
          actions: [
            {
              actor: 'player',
              actionType: 'retreat',
              description: '玩家脱离了这场遭遇战。',
            },
          ],
        },
      ],
    };

    return {
      ...passRule('战斗回合已结算'),
      legality,
      phase: {
        previousPhaseId: options.combatState.currentPhaseId,
        nextPhaseId: options.combatState.currentPhaseId,
        changed: false,
      },
      combatState: escapeState,
      result: 'escape',
      playerDamageTaken: 0,
      enemyDamageTaken: 0,
    };
  }

  const baseEnemyDamage = tacticDamageTable[options.enemyTactic] ?? 4;
  const basePlayerDamage = playerDamageTable[options.playerActionType];
  const enemyDamageTaken =
    options.playerActionType === 'analyze' ? 4 : basePlayerDamage;
  let playerDamageTaken =
    options.enemyTactic === 'counter' &&
    ['attack', 'special'].includes(options.playerActionType)
      ? 8
      : baseEnemyDamage;

  if (options.playerActionType === 'guard') {
    playerDamageTaken = Math.floor(playerDamageTaken / 2);
  }

  if (options.playerActionType === 'analyze') {
    playerDamageTaken = Math.max(0, playerDamageTaken - 2);
  }

  const healedPlayerHp =
    options.playerActionType === 'heal'
      ? clamp(options.combatState.player.hp + 6, 0, options.combatState.player.maxHp)
      : options.combatState.player.hp;
  const nextPlayerHp = clamp(
    healedPlayerHp - playerDamageTaken,
    0,
    options.combatState.player.maxHp,
  );
  const nextEnemyHp = clamp(
    options.combatState.enemy.hp - enemyDamageTaken,
    0,
    options.combatState.enemy.maxHp,
  );

  const logActions: CombatLogEntry['actions'] = [
    {
      actor: 'player',
      actionType: options.playerActionType,
      description: `玩家使用了${combatActionLabels[options.playerActionType]}。`,
      value:
        options.playerActionType === 'heal'
          ? 6
          : enemyDamageTaken > 0
            ? enemyDamageTaken
            : undefined,
    },
    {
      actor: 'enemy',
      actionType: options.enemyTactic,
      description: `敌人以${enemyTacticLabels[options.enemyTactic]}战术作出回应。`,
      value: playerDamageTaken,
    },
  ];

  const baseState: CombatState = {
    ...options.combatState,
    turn: options.combatState.turn + 1,
    activeTactic: options.enemyTactic,
    player: {
      ...options.combatState.player,
      hp: nextPlayerHp,
    },
    enemy: {
      ...options.combatState.enemy,
      hp: nextEnemyHp,
    },
  };

  const phase = resolveCombatPhase(options.encounter, baseState);
  if (phase.changed) {
    const nextPhaseLabel =
      options.encounter.bossPhases?.find((entry) => entry.id === phase.nextPhaseId)?.label ??
      phase.nextPhaseId;
    logActions.unshift({
      actor: 'system',
      actionType: 'phase-shift',
      description: `战斗已切换到“${nextPhaseLabel}”阶段。`,
    });
  }

  let result: CombatResult | undefined;
  if (nextEnemyHp === 0) {
    result = 'victory';
  } else if (nextPlayerHp === 0) {
    result = 'defeat';
  }

  const combatState: CombatState = {
    ...baseState,
    currentPhaseId: phase.nextPhaseId,
    result,
    logs: [
      ...options.combatState.logs,
      {
        turn: options.combatState.turn,
        phaseId: phase.nextPhaseId,
        activeTactic: options.enemyTactic,
        actions: logActions,
      },
    ],
  };

  return {
    ...passRule('战斗回合已结算'),
    legality,
    phase,
    combatState,
    result,
    playerDamageTaken,
    enemyDamageTaken,
  };
};
