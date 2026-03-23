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
    reasons.push('combat encounter is already resolved');
  }

  if (!allowedCombatActions.includes(actionType as CombatActionType)) {
    reasons.push(`unsupported combat action: ${actionType}`);
  }

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      actionType,
      reasons,
    };
  }

  return {
    ...passRule('combat action is legal'),
    actionType,
    reasons: ['combat action is legal'],
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
      ...failRule(legality.reason ?? 'combat action is illegal'),
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
              description: 'The player disengages from the encounter.',
            },
          ],
        },
      ],
    };

    return {
      ...passRule('combat round resolved'),
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
      description: `The player uses ${options.playerActionType}.`,
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
      description: `The enemy responds with ${options.enemyTactic}.`,
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
    logActions.unshift({
      actor: 'system',
      actionType: 'phase-shift',
      description: `The encounter shifts into ${phase.nextPhaseId}.`,
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
    ...passRule('combat round resolved'),
    legality,
    phase,
    combatState,
    result,
    playerDamageTaken,
    enemyDamageTaken,
  };
};
