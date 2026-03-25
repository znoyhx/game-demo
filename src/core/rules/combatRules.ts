import type {
  CombatDebugPlayerPattern,
  CombatCommandAction,
  CombatEncounterDefinition,
  CombatEnvironmentState,
  CombatLogEntry,
  CombatResult,
  CombatState,
  EnemyTacticType,
  PlayerState,
} from '../schemas';

import { failRule, passRule, type RuleResult } from './ruleResult';

export const allowedCombatActions: CombatCommandAction[] = [
  'attack',
  'guard',
  'heal',
  'analyze',
  'special',
  'retreat',
];

export type CombatActionType = CombatCommandAction;

const combatActionLabels: Record<CombatActionType, string> = {
  attack: '攻击',
  guard: '防御',
  heal: '治疗',
  analyze: '解析',
  special: '特技',
  retreat: '撤退',
};

const enemyTacticLabels: Record<EnemyTacticType, string> = {
  aggressive: '压制强攻',
  defensive: '消耗防守',
  counter: '反制反击',
  trap: '诱导陷阱',
  summon: '召唤支援',
  'resource-lock': '资源封锁',
};

const tacticBaseDamageTable: Record<EnemyTacticType, number> = {
  aggressive: 9,
  defensive: 4,
  counter: 6,
  trap: 5,
  summon: 4,
  'resource-lock': 5,
};

const playerBaseDamageTable: Record<CombatActionType, number> = {
  attack: 12,
  guard: 0,
  heal: 0,
  analyze: 5,
  special: 18,
  retreat: 0,
};

const trackedEnergyCostTable: Record<Exclude<CombatActionType, 'retreat'>, number> = {
  attack: 0,
  guard: 0,
  heal: 2,
  analyze: 1,
  special: 3,
};

const hazardDamageBonus = {
  stable: 0,
  tense: 1,
  volatile: 2,
} as const;

const transientPlayerStatuses = new Set(['guarded', 'snared', 'exhausted', 'focused']);
const transientEnemyStatuses = new Set([
  'fortified',
  'reinforced',
  'exposed',
  'tracked',
]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const removeTransientStatuses = (
  statuses: string[] | undefined,
  transientStatuses: Set<string>,
) => (statuses ?? []).filter((status) => !transientStatuses.has(status));

const appendUniqueStatus = (statuses: string[], status: string) =>
  statuses.includes(status) ? statuses : [...statuses, status];

const getTrackedEnergy = (playerState?: PlayerState): number | null =>
  typeof playerState?.energy === 'number' ? playerState.energy : null;

const getPhaseBias = (
  encounter: CombatEncounterDefinition,
  phaseId: string | undefined,
  tactic: EnemyTacticType,
) => {
  const currentPhase = encounter.bossPhases?.find((phase) => phase.id === phaseId);
  return currentPhase?.tacticBias?.includes(tactic) ?? false;
};

const getDominantAction = (
  commonPlayerActions: CombatCommandAction[] | undefined,
): CombatCommandAction | null => {
  if (!commonPlayerActions || commonPlayerActions.length === 0) {
    return null;
  }

  const counts = new Map<CombatCommandAction, number>();
  let dominant: CombatCommandAction | null = null;
  let maxCount = 0;

  commonPlayerActions.forEach((action) => {
    const nextCount = (counts.get(action) ?? 0) + 1;
    counts.set(action, nextCount);

    if (nextCount >= maxCount) {
      dominant = action;
      maxCount = nextCount;
    }
  });

  return dominant;
};

const pickPhaseTacticBias = (
  encounter: CombatEncounterDefinition,
  phaseId: string | undefined,
) =>
  encounter.bossPhases
    ?.find((phase) => phase.id === phaseId)
    ?.tacticBias?.find((tactic) => encounter.tacticPool.includes(tactic));

const buildDeterministicRoll = (seed: number, turn: number, salt = 0) => {
  let value = (seed + 1) * 1664525 + (turn + 1) * 1013904223 + salt * 69069;
  value >>>= 0;
  value = (value ^ (value >>> 15)) >>> 0;
  return value / 0x100000000;
};

const rotateCandidates = <T,>(items: T[], offset: number) => {
  if (items.length === 0) {
    return items;
  }

  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
};

const buildPlayerActionDescription = (
  actionType: CombatActionType,
  energyCost: number,
  healingAmount: number,
  damageAmount: number,
) => {
  if (actionType === 'heal') {
    return `玩家发动了${combatActionLabels[actionType]}，恢复了 ${healingAmount} 点生命。`;
  }

  if (actionType === 'guard') {
    return '玩家稳住阵型，准备承受这一轮冲击。';
  }

  if (actionType === 'retreat') {
    return '玩家主动脱离了这场遭遇战。';
  }

  const damageText = damageAmount > 0 ? `造成 ${damageAmount} 点伤害` : '未造成直接伤害';
  const energyText = energyCost > 0 ? `，消耗 ${energyCost} 点能量` : '';

  return `玩家使用了${combatActionLabels[actionType]}，${damageText}${energyText}。`;
};

const buildEnemyActionDescription = (
  tactic: EnemyTacticType,
  playerDamageTaken: number,
  dominantAction: CombatActionType | null,
) => {
  const patternHint =
    tactic === 'counter' && dominantAction
      ? `它正在针对你惯用的${combatActionLabels[dominantAction]}节奏进行反制。`
      : tactic === 'trap' && dominantAction
        ? `它试图借你偏好的${combatActionLabels[dominantAction]}动作布置陷阱。`
        : '';

  return `敌方执行了${enemyTacticLabels[tactic]}，本轮造成 ${playerDamageTaken} 点压力伤害。${patternHint}`.trim();
};

export interface CombatLegalityResult extends RuleResult {
  actionType: string;
  reasons: string[];
}

export const evaluateCombatActionLegality = (
  combatState: CombatState,
  actionType: string,
  playerState?: PlayerState,
): CombatLegalityResult => {
  const reasons: string[] = [];
  const trackedEnergy = getTrackedEnergy(playerState);

  if (combatState.result) {
    reasons.push('这场战斗已经结算完成。');
  }

  if (!allowedCombatActions.includes(actionType as CombatActionType)) {
    reasons.push(`不支持的战斗动作：${actionType}`);
  }

  if (allowedCombatActions.includes(actionType as CombatActionType)) {
    const typedAction = actionType as CombatActionType;

    if (
      trackedEnergy !== null &&
      typedAction !== 'retreat' &&
      trackedEnergy < trackedEnergyCostTable[typedAction]
    ) {
      reasons.push(`${combatActionLabels[typedAction]}所需能量不足。`);
    }

    if (typedAction === 'heal' && combatState.player.hp >= combatState.player.maxHp) {
      reasons.push('当前生命值已满，无需继续治疗。');
    }
  }

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      actionType,
      reasons,
    };
  }

  return {
    ...passRule('战斗动作合法。'),
    actionType,
    reasons: ['战斗动作合法。'],
  };
};

export interface CombatPhaseResult {
  previousPhaseId?: string;
  nextPhaseId?: string;
  changed: boolean;
}

export const resolvePreferredCombatTactic = (options: {
  encounter: CombatEncounterDefinition;
  phaseId?: string;
  preferredTactic?: EnemyTacticType | null;
  fallbackTactic?: EnemyTacticType;
}) => {
  if (
    options.preferredTactic &&
    options.encounter.tacticPool.includes(options.preferredTactic)
  ) {
    return options.preferredTactic;
  }

  const phaseTactic = pickPhaseTacticBias(options.encounter, options.phaseId);
  if (phaseTactic) {
    return phaseTactic;
  }

  if (
    options.fallbackTactic &&
    options.encounter.tacticPool.includes(options.fallbackTactic)
  ) {
    return options.fallbackTactic;
  }

  return options.encounter.tacticPool[0];
};

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

export interface ApplyDebugCombatPhaseResult extends RuleResult {
  combatState: CombatState;
  selectedTactic: EnemyTacticType;
  phaseId?: string;
}

export const applyDebugCombatPhase = (options: {
  encounter: CombatEncounterDefinition;
  combatState: CombatState;
  forcedPhaseId: string;
  preferredTactic?: EnemyTacticType | null;
  addLog?: boolean;
}): ApplyDebugCombatPhaseResult => {
  const phase = options.encounter.bossPhases?.find(
    (entry) => entry.id === options.forcedPhaseId,
  );

  if (!phase) {
    return {
      ...failRule(`未找到阶段 ${options.forcedPhaseId}。`),
      combatState: options.combatState,
      selectedTactic: options.combatState.activeTactic,
      phaseId: options.combatState.currentPhaseId,
    };
  }

  const selectedTactic = resolvePreferredCombatTactic({
    encounter: options.encounter,
    phaseId: phase.id,
    preferredTactic: options.preferredTactic,
    fallbackTactic: options.combatState.activeTactic,
  });

  const debugActions: CombatLogEntry['actions'] = [];

  if (options.addLog ?? true) {
    debugActions.push({
      actor: 'system',
      actionType: 'debug-phase-force',
      description: `调试流程已将首领阶段强制切换到“${phase.label}”。`,
    });

    if (selectedTactic !== options.combatState.activeTactic) {
      debugActions.push({
        actor: 'system',
        actionType: 'debug-tactic-sync',
        description: `当前阶段已同步首领战术为“${enemyTacticLabels[selectedTactic]}”。`,
      });
    }
  }

  const combatState: CombatState = {
    ...options.combatState,
    currentPhaseId: phase.id,
    activeTactic: selectedTactic,
    logs:
      debugActions.length === 0
        ? options.combatState.logs
        : [
            ...options.combatState.logs,
            {
              turn: options.combatState.turn,
              phaseId: phase.id,
              activeTactic: selectedTactic,
              actions: debugActions,
            },
          ],
  };

  return {
    ...passRule(`首领阶段已切换到“${phase.label}”。`),
    combatState,
    selectedTactic,
    phaseId: phase.id,
  };
};

export interface SimulatedCombatActionResult extends RuleResult {
  selectedAction: CombatActionType;
  pattern: CombatDebugPlayerPattern;
  candidates: CombatActionType[];
}

export const resolveSimulatedCombatAction = (options: {
  combatState: CombatState;
  playerState: PlayerState;
  pattern: CombatDebugPlayerPattern;
  seed: number;
}): SimulatedCombatActionResult => {
  const currentHpRatio =
    options.playerState.maxHp === 0
      ? 0
      : options.playerState.hp / options.playerState.maxHp;
  const currentEnergy = options.playerState.energy ?? 0;
  const hasAnalyzed = options.combatState.logs.some((log) =>
    log.actions.some(
      (action) => action.actor === 'player' && action.actionType === 'analyze',
    ),
  );
  const roll = buildDeterministicRoll(options.seed, options.combatState.turn);

  let candidates: CombatActionType[];

  switch (options.pattern) {
    case 'guard-cycle':
      candidates =
        options.combatState.turn % 3 === 1
          ? ['guard', 'attack', 'heal']
          : options.combatState.turn % 3 === 2
            ? ['attack', 'guard', 'analyze']
            : ['heal', 'guard', 'attack'];
      break;
    case 'resource-burst':
      candidates =
        currentEnergy >= 3 && roll >= 0.25
          ? ['special', 'attack', 'guard', 'heal']
          : currentHpRatio <= 0.45
            ? ['heal', 'guard', 'attack']
            : ['attack', 'special', 'guard'];
      break;
    case 'analysis-first':
      candidates =
        !hasAnalyzed || options.combatState.turn === 1
          ? ['analyze', 'guard', 'attack', 'heal']
          : currentHpRatio <= 0.4
            ? ['heal', 'guard', 'attack']
            : ['attack', 'guard', 'special', 'analyze'];
      break;
    case 'direct-pressure':
    default:
      candidates =
        currentHpRatio <= 0.35
          ? ['heal', 'guard', 'attack']
          : currentEnergy >= 3 && roll >= 0.45
            ? ['special', 'attack', 'guard']
            : ['attack', 'special', 'guard', 'analyze'];
      break;
  }

  const rotatedCandidates =
    options.pattern === 'analysis-first' &&
    (!hasAnalyzed || options.combatState.turn === 1)
      ? candidates
      : rotateCandidates(
          candidates,
          Math.floor(roll * Math.max(candidates.length, 1)),
        );
  const fallbackCandidates = rotateCandidates(
    allowedCombatActions,
    Math.floor(buildDeterministicRoll(options.seed, options.combatState.turn, 1) * allowedCombatActions.length),
  );
  const orderedCandidates = [...new Set([...rotatedCandidates, ...fallbackCandidates])];
  const selectedAction =
    orderedCandidates.find((action) =>
      evaluateCombatActionLegality(
        options.combatState,
        action,
        options.playerState,
      ).ok,
    ) ?? 'retreat';

  return {
    ...passRule(`已按“${options.pattern}”模式生成确定性动作。`),
    selectedAction,
    pattern: options.pattern,
    candidates: orderedCandidates,
  };
};

export interface CombatRoundResult extends RuleResult {
  combatState: CombatState;
  playerState: PlayerState;
  legality: CombatLegalityResult;
  phase: CombatPhaseResult;
  result?: CombatResult;
  playerDamageTaken: number;
  enemyDamageTaken: number;
  energyDelta: number;
}

export const resolveCombatRound = (options: {
  encounter: CombatEncounterDefinition;
  combatState: CombatState;
  playerState: PlayerState;
  playerActionType: CombatActionType;
  enemyTactic: EnemyTacticType;
  commonPlayerActions?: CombatCommandAction[];
  environmentState?: CombatEnvironmentState;
}): CombatRoundResult => {
  const legality = evaluateCombatActionLegality(
    options.combatState,
    options.playerActionType,
    options.playerState,
  );

  if (!legality.ok) {
    return {
      ...failRule(legality.reason ?? '战斗动作不合法。'),
      legality,
      phase: {
        previousPhaseId: options.combatState.currentPhaseId,
        nextPhaseId: options.combatState.currentPhaseId,
        changed: false,
      },
      combatState: options.combatState,
      playerState: options.playerState,
      playerDamageTaken: 0,
      enemyDamageTaken: 0,
      energyDelta: 0,
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
              description: buildPlayerActionDescription('retreat', 0, 0, 0),
            },
          ],
        },
      ],
    };

    return {
      ...passRule('战斗回合已结算。'),
      legality,
      phase: {
        previousPhaseId: options.combatState.currentPhaseId,
        nextPhaseId: options.combatState.currentPhaseId,
        changed: false,
      },
      combatState: escapeState,
      playerState: options.playerState,
      result: 'escape',
      playerDamageTaken: 0,
      enemyDamageTaken: 0,
      energyDelta: 0,
    };
  }

  const trackedEnergy = getTrackedEnergy(options.playerState);
  const semiRealtimeEnergyCost =
    options.encounter.mode === 'semi-realtime' &&
    ['heal', 'analyze', 'special'].includes(options.playerActionType)
      ? 1
      : 0;
  const energyCost =
    trackedEnergyCostTable[options.playerActionType] + semiRealtimeEnergyCost;

  const dominantAction = getDominantAction(options.commonPlayerActions);
  const hazardBonus = options.environmentState
    ? hazardDamageBonus[options.environmentState.hazard]
    : 0;
  const phaseBiasActive = getPhaseBias(
    options.encounter,
    options.combatState.currentPhaseId,
    options.enemyTactic,
  );

  let playerDamageTaken =
    tacticBaseDamageTable[options.enemyTactic] +
    hazardBonus +
    (options.encounter.mode === 'semi-realtime' ? 1 : 0) +
    (phaseBiasActive ? 1 : 0);
  let enemyDamageTaken = playerBaseDamageTable[options.playerActionType];
  const healingAmount = options.playerActionType === 'heal' ? 9 : 0;
  let resourceDrain = 0;

  switch (options.enemyTactic) {
    case 'aggressive':
      enemyDamageTaken += 2;
      if (
        options.combatState.player.hp / options.combatState.player.maxHp <= 0.5 ||
        dominantAction === 'attack' ||
        dominantAction === 'special'
      ) {
        playerDamageTaken += 3;
      }
      break;
    case 'defensive':
      enemyDamageTaken = Math.max(0, enemyDamageTaken - 5);
      playerDamageTaken = Math.max(1, playerDamageTaken - 1);
      break;
    case 'counter':
      if (
        options.playerActionType === 'attack' ||
        options.playerActionType === 'special' ||
        dominantAction === 'attack' ||
        dominantAction === 'special'
      ) {
        playerDamageTaken += 4;
      } else {
        playerDamageTaken = Math.max(1, playerDamageTaken - 2);
      }
      break;
    case 'trap':
      enemyDamageTaken = Math.max(0, enemyDamageTaken - 2);
      if (
        options.environmentState?.hazard === 'volatile' ||
        dominantAction === 'guard' ||
        dominantAction === 'heal' ||
        dominantAction === 'analyze'
      ) {
        playerDamageTaken += 3;
      } else {
        playerDamageTaken += 1;
      }
      break;
    case 'summon':
      enemyDamageTaken = Math.max(0, enemyDamageTaken - 1);
      playerDamageTaken += Math.min(3, Math.max(0, options.combatState.turn - 1));
      break;
    case 'resource-lock':
      enemyDamageTaken = Math.max(0, enemyDamageTaken - 3);
      playerDamageTaken += 1;
      if (
        options.playerActionType === 'heal' ||
        options.playerActionType === 'special' ||
        options.playerActionType === 'analyze' ||
        dominantAction === 'heal' ||
        dominantAction === 'special'
      ) {
        playerDamageTaken += 2;
      }
      break;
    default:
      break;
  }

  if (options.playerActionType === 'guard') {
    playerDamageTaken = Math.floor(playerDamageTaken / 2);
  }

  if (options.playerActionType === 'analyze') {
    playerDamageTaken = Math.max(0, playerDamageTaken - 2);
    enemyDamageTaken += 1;
  }

  if (
    options.playerActionType === 'special' &&
    options.environmentState?.hazard === 'volatile'
  ) {
    enemyDamageTaken += 2;
  }

  const energyAfterActionCost =
    trackedEnergy === null ? null : clamp(trackedEnergy - energyCost, 0, trackedEnergy);

  if (options.enemyTactic === 'resource-lock' && energyAfterActionCost !== null) {
    resourceDrain = Math.min(3, energyAfterActionCost);
  }

  const nextEnergy =
    energyAfterActionCost === null
      ? null
      : clamp(energyAfterActionCost - resourceDrain, 0, options.playerState.energy ?? 0);

  const healedPlayerHp = clamp(
    options.playerState.hp + healingAmount,
    0,
    options.playerState.maxHp,
  );
  const nextPlayerHp = clamp(
    healedPlayerHp - playerDamageTaken,
    0,
    options.playerState.maxHp,
  );
  const nextEnemyHp = clamp(
    options.combatState.enemy.hp - enemyDamageTaken,
    0,
    options.combatState.enemy.maxHp,
  );

  let nextPlayerStatuses = removeTransientStatuses(
    options.combatState.player.statusEffects,
    transientPlayerStatuses,
  );
  let nextEnemyStatuses = removeTransientStatuses(
    options.combatState.enemy.statusEffects,
    transientEnemyStatuses,
  );

  if (options.playerActionType === 'guard') {
    nextPlayerStatuses = appendUniqueStatus(nextPlayerStatuses, 'guarded');
  }

  if (options.playerActionType === 'analyze') {
    nextPlayerStatuses = appendUniqueStatus(nextPlayerStatuses, 'focused');
    nextEnemyStatuses = appendUniqueStatus(nextEnemyStatuses, 'tracked');
  }

  if (options.enemyTactic === 'trap') {
    nextPlayerStatuses = appendUniqueStatus(nextPlayerStatuses, 'snared');
  }

  if (options.enemyTactic === 'resource-lock' && resourceDrain > 0) {
    nextPlayerStatuses = appendUniqueStatus(nextPlayerStatuses, 'exhausted');
  }

  if (options.enemyTactic === 'defensive') {
    nextEnemyStatuses = appendUniqueStatus(nextEnemyStatuses, 'fortified');
  }

  if (options.enemyTactic === 'summon') {
    nextEnemyStatuses = appendUniqueStatus(nextEnemyStatuses, 'reinforced');
  }

  if (options.enemyTactic === 'aggressive') {
    nextEnemyStatuses = appendUniqueStatus(nextEnemyStatuses, 'exposed');
  }

  const logActions: CombatLogEntry['actions'] = [
    {
      actor: 'player',
      actionType: options.playerActionType,
      description: buildPlayerActionDescription(
        options.playerActionType,
        energyCost,
        healingAmount,
        enemyDamageTaken,
      ),
      value:
        options.playerActionType === 'heal'
          ? healingAmount
          : enemyDamageTaken > 0
            ? enemyDamageTaken
            : undefined,
    },
    {
      actor: 'enemy',
      actionType: options.enemyTactic,
      description: buildEnemyActionDescription(
        options.enemyTactic,
        playerDamageTaken,
        dominantAction,
      ),
      value: playerDamageTaken,
    },
  ];

  if (resourceDrain > 0) {
    logActions.push({
      actor: 'system',
      actionType: 'resource-lock',
      description: `敌方封锁了你的资源回路，额外抽离 ${resourceDrain} 点能量。`,
      value: resourceDrain,
    });
  }

  if (options.enemyTactic === 'summon') {
    logActions.push({
      actor: 'system',
      actionType: 'summon-support',
      description: '余烬援军短暂加入战场，为敌方提供了额外压制。',
      value: Math.min(3, Math.max(0, options.combatState.turn - 1)),
    });
  }

  const baseState: CombatState = {
    ...options.combatState,
    turn: options.combatState.turn + 1,
    activeTactic: options.enemyTactic,
    player: {
      ...options.combatState.player,
      hp: nextPlayerHp,
      statusEffects: nextPlayerStatuses,
    },
    enemy: {
      ...options.combatState.enemy,
      hp: nextEnemyHp,
      statusEffects: nextEnemyStatuses,
    },
  };

  const phase = resolveCombatPhase(options.encounter, baseState);
  if (phase.changed) {
    const nextPhaseLabel =
      options.encounter.bossPhases?.find((entry) => entry.id === phase.nextPhaseId)
        ?.label ?? phase.nextPhaseId;
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

  const playerState: PlayerState = {
    ...options.playerState,
    hp: nextPlayerHp,
    energy: nextEnergy === null ? options.playerState.energy : nextEnergy,
  };

  return {
    ...passRule('战斗回合已结算。'),
    legality,
    phase,
    combatState,
    playerState,
    result,
    playerDamageTaken,
    enemyDamageTaken,
    energyDelta:
      trackedEnergy === null || nextEnergy === null ? 0 : nextEnergy - trackedEnergy,
  };
};
