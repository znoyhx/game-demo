import type {
  CombatCommandAction,
  CombatEncounterDefinition,
  CombatHistoryEntry,
  CombatPhaseChange,
  CombatPlayerBehaviorSummary,
  CombatResult,
  CombatState,
  CombatTacticChange,
  EventLogEntry,
  ExplanationItem,
  PlayerProfileTag,
  QuestProgress,
  ReviewCombatSummary,
  ReviewPayload,
} from '../schemas';

import {
  formatCombatResultLabel,
  formatEnemyTacticLabel,
  formatPlayerTagLabel,
} from '../utils/displayLabels';

const combatActionLabels: Record<CombatCommandAction, string> = {
  attack: '攻击',
  guard: '防御',
  heal: '治疗',
  analyze: '解析',
  special: '特技',
  retreat: '撤退',
};

const getEncounterPhaseLabel = (
  encounter: CombatEncounterDefinition | null | undefined,
  phaseId: string | undefined,
) => {
  if (!phaseId) {
    return '未知阶段';
  }

  return (
    encounter?.bossPhases?.find((phase) => phase.id === phaseId)?.label ?? phaseId
  );
};

const getCompletedTurnCount = (combatState: CombatState) => {
  const lastLoggedTurn = combatState.logs[combatState.logs.length - 1]?.turn;

  if (typeof lastLoggedTurn === 'number') {
    return lastLoggedTurn;
  }

  return Math.max(1, combatState.turn - (combatState.result ? 1 : 0));
};

const countPlayerActions = (combatState: CombatState) => {
  const counts = new Map<CombatCommandAction, { count: number; lastSeen: number }>();

  combatState.logs.forEach((log, logIndex) => {
    log.actions.forEach((action) => {
      if (action.actor !== 'player') {
        return;
      }

      const typedAction = action.actionType as CombatCommandAction;
      if (!(typedAction in combatActionLabels)) {
        return;
      }

      const current = counts.get(typedAction);
      counts.set(typedAction, {
        count: (current?.count ?? 0) + 1,
        lastSeen: logIndex,
      });
    });
  });

  return counts;
};

export const summarizeCombatTacticChanges = (
  combatState: CombatState,
  encounter?: CombatEncounterDefinition | null,
): CombatTacticChange[] => {
  const changes: CombatTacticChange[] = [];
  let previousTactic: CombatState['activeTactic'] | undefined;

  combatState.logs.forEach((log) => {
    if (!log.activeTactic) {
      return;
    }

    if (previousTactic && previousTactic !== log.activeTactic) {
      const phaseLabel = getEncounterPhaseLabel(encounter, log.phaseId);
      changes.push({
        turn: log.turn,
        fromTactic: previousTactic,
        toTactic: log.activeTactic,
        phaseId: log.phaseId,
        summary: `第 ${log.turn} 回合切换为“${formatEnemyTacticLabel(log.activeTactic)}”，当前阶段为“${phaseLabel}”。`,
      });
    }

    previousTactic = log.activeTactic;
  });

  return changes;
};

export const summarizeCombatPhaseChanges = (
  combatState: CombatState,
  encounter?: CombatEncounterDefinition | null,
): CombatPhaseChange[] => {
  const changes: CombatPhaseChange[] = [];
  let previousPhaseId: string | undefined;

  combatState.logs.forEach((log) => {
    const hasPhaseShiftAction = log.actions.some(
      (action) => action.actionType === 'phase-shift',
    );

    if (
      log.phaseId &&
      previousPhaseId &&
      previousPhaseId !== log.phaseId &&
      hasPhaseShiftAction
    ) {
      changes.push({
        turn: log.turn,
        fromPhaseId: previousPhaseId,
        toPhaseId: log.phaseId,
        summary: `第 ${log.turn} 回合从“${getEncounterPhaseLabel(encounter, previousPhaseId)}”切换到“${getEncounterPhaseLabel(encounter, log.phaseId)}”。`,
      });
    }

    if (log.phaseId) {
      previousPhaseId = log.phaseId;
    }
  });

  return changes;
};

export const summarizeCombatPlayerBehaviors = (
  combatState: CombatState,
  limit = 3,
): CombatPlayerBehaviorSummary[] =>
  [...countPlayerActions(combatState).entries()]
    .sort((left, right) => {
      if (left[1].count !== right[1].count) {
        return right[1].count - left[1].count;
      }

      return right[1].lastSeen - left[1].lastSeen;
    })
    .slice(0, limit)
    .map(([actionType, stats]) => ({
      actionType,
      count: stats.count,
      summary: `玩家共使用“${combatActionLabels[actionType]}”${stats.count} 次。`,
    }));

export const buildCombatHistoryEntry = (options: {
  encounter?: CombatEncounterDefinition | null;
  combatState: CombatState;
  resolvedAt: string;
}): CombatHistoryEntry => ({
  encounterId: options.combatState.encounterId,
  result: options.combatState.result ?? 'escape',
  finalTactic: options.combatState.activeTactic,
  resolvedAt: options.resolvedAt,
  turnCount: getCompletedTurnCount(options.combatState),
  finalPhaseId: options.combatState.currentPhaseId,
  tacticChanges: summarizeCombatTacticChanges(options.combatState, options.encounter),
  phaseChanges: summarizeCombatPhaseChanges(options.combatState, options.encounter),
  keyPlayerBehaviors: summarizeCombatPlayerBehaviors(options.combatState),
});

export const buildCombatReviewSummary = (options: {
  encounter?: CombatEncounterDefinition | null;
  combatState: CombatState;
}): ReviewCombatSummary | null => {
  if (!options.combatState.result) {
    return null;
  }

  return {
    result: {
      result: options.combatState.result,
      totalTurns: getCompletedTurnCount(options.combatState),
      finalTactic: options.combatState.activeTactic,
      finalPhaseId: options.combatState.currentPhaseId,
      playerRemainingHp: options.combatState.player.hp,
      enemyRemainingHp: options.combatState.enemy.hp,
      summary:
        options.combatState.result === 'victory'
          ? `本场首领战以“${formatCombatResultLabel(options.combatState.result)}”结束，共经历 ${getCompletedTurnCount(options.combatState)} 回合，最终战术为“${formatEnemyTacticLabel(options.combatState.activeTactic)}”。`
          : options.combatState.result === 'defeat'
            ? `本场首领战以“${formatCombatResultLabel(options.combatState.result)}”结束，共经历 ${getCompletedTurnCount(options.combatState)} 回合，首领最终保持“${formatEnemyTacticLabel(options.combatState.activeTactic)}”节奏。`
            : `本场战斗以“${formatCombatResultLabel(options.combatState.result)}”结束，共经历 ${getCompletedTurnCount(options.combatState)} 回合。`,
    },
    tacticChanges: summarizeCombatTacticChanges(options.combatState, options.encounter),
    phaseChanges: summarizeCombatPhaseChanges(options.combatState, options.encounter),
    keyPlayerBehaviors: summarizeCombatPlayerBehaviors(options.combatState),
  };
};

const buildCombatExplanations = (options: {
  encounter?: CombatEncounterDefinition | null;
  combatSummary: ReviewCombatSummary;
  playerTags: PlayerProfileTag[];
}): ExplanationItem[] => {
  const explanations: ExplanationItem[] = [];
  const { combatSummary } = options;

  explanations.push({
    type: 'combat',
    title: '首领战术切换轨迹',
    summary:
      combatSummary.tacticChanges.length > 0
        ? `首领共发生 ${combatSummary.tacticChanges.length} 次战术切换，说明它会根据回合推进与玩家习惯动态调整。`
        : `首领本场未出现明显战术切换，主要维持“${formatEnemyTacticLabel(combatSummary.result.finalTactic)}”策略。`,
    evidence:
      combatSummary.tacticChanges.length > 0
        ? combatSummary.tacticChanges.map((change) => change.summary)
        : [combatSummary.result.summary],
  });

  explanations.push({
    type: 'combat',
    title: '首领阶段变化',
    summary:
      combatSummary.phaseChanges.length > 0
        ? `首领共进入 ${combatSummary.phaseChanges.length + 1} 个阶段，阶段切换会直接影响战术偏好。`
        : `首领本场未发生阶段变化，始终停留在“${getEncounterPhaseLabel(options.encounter, combatSummary.result.finalPhaseId)}”。`,
    evidence:
      combatSummary.phaseChanges.length > 0
        ? combatSummary.phaseChanges.map((change) => change.summary)
        : [combatSummary.result.summary],
  });

  if (combatSummary.keyPlayerBehaviors.length > 0) {
    explanations.push({
      type: 'playerModel',
      title: '玩家行为重点',
      summary: `玩家本场最常用的操作为 ${combatSummary.keyPlayerBehaviors
        .map((behavior) => `“${combatActionLabels[behavior.actionType]}”`)
        .join('、')}。`,
      evidence: [
        ...combatSummary.keyPlayerBehaviors.map((behavior) => behavior.summary),
        `当前玩家标签：${options.playerTags.map(formatPlayerTagLabel).join('、') || '无'}`,
      ],
    });
  }

  return explanations;
};

const buildCombatSuggestions = (
  combatSummary: ReviewCombatSummary,
  result: CombatResult,
) => {
  const suggestions = new Set<string>();

  switch (combatSummary.result.finalTactic) {
    case 'aggressive':
      suggestions.add('下次首领转入“压制强攻”时，优先保留防御与治疗窗口，不要连续硬拼。');
      break;
    case 'defensive':
      suggestions.add('下次面对“防守消耗”时，优先用解析和特技制造破防窗口。');
      break;
    case 'counter':
      suggestions.add('下次面对“套路反制”时，避免连续重复攻击，穿插防御或解析来打断读招。');
      break;
    case 'trap':
      suggestions.add('下次面对“诱导陷阱”时，不要连续守御或治疗，先观察再出手。');
      break;
    case 'summon':
      suggestions.add('下次面对“召唤支援”时，优先在援军成型前集中爆发，压缩首领铺场时间。');
      break;
    case 'resource-lock':
      suggestions.add('下次面对“资源封锁”时，要提前保留能量，避免在低资源时交出关键技能。');
      break;
    default:
      break;
  }

  if (combatSummary.phaseChanges.length > 0) {
    suggestions.add('留意首领阶段切换前的血量阈值，提前准备下一轮的应对资源。');
  }

  if (combatSummary.keyPlayerBehaviors[0]?.actionType === 'attack') {
    suggestions.add('如果你仍然偏好连续攻击，可以在每两次输出之间插入一次防御或解析，降低被针对概率。');
  }

  if (result === 'defeat') {
    suggestions.add('下次先把前两回合打成稳态，再决定是否投入高消耗特技。');
  }

  if (result === 'victory') {
    suggestions.add('你已经摸清了首领节奏，下一次可以尝试更早逼出阶段切换并压缩战斗回合数。');
  }

  return [...suggestions].slice(0, 3);
};

export const buildReviewPayload = (options: {
  generatedAt: string;
  playerTags: PlayerProfileTag[];
  encounter?: CombatEncounterDefinition | null;
  combat?: CombatState | null;
  combatHistory?: CombatHistoryEntry[];
  questProgress: QuestProgress[];
  eventHistory: EventLogEntry[];
}): ReviewPayload => {
  const combatSummary =
    options.combat ? buildCombatReviewSummary({ encounter: options.encounter, combatState: options.combat }) : null;
  const activeQuestCount = options.questProgress.filter(
    (quest) => quest.status === 'active',
  ).length;
  const completedQuestCount = options.questProgress.filter(
    (quest) => quest.status === 'completed',
  ).length;
  const latestCombatHistory = options.combatHistory?.[options.combatHistory.length - 1];

  const keyEvents = combatSummary
    ? [
        combatSummary.result.summary,
        combatSummary.phaseChanges.length > 0
          ? `首领在本场战斗中触发了 ${combatSummary.phaseChanges.length} 次阶段切换。`
          : '首领本场未进入新的阶段。',
        combatSummary.tacticChanges.length > 0
          ? `首领共进行了 ${combatSummary.tacticChanges.length} 次可见战术切换。`
          : '首领本场没有出现额外的战术切换。',
        `本轮流程中已完成 ${completedQuestCount} 条任务线，仍有 ${activeQuestCount} 条任务线处于进行中。`,
      ]
    : [
        `本轮流程中已完成 ${completedQuestCount} 条任务线结算。`,
        `当前仍有 ${activeQuestCount} 条任务线处于进行中。`,
        `共有 ${options.eventHistory.length} 个世界事件影响了当前状态。`,
      ];

  const explanations = combatSummary
    ? [
        ...buildCombatExplanations({
          encounter: options.encounter,
          combatSummary,
          playerTags: options.playerTags,
        }),
        {
          type: 'event' as const,
          title: '世界状态干扰',
          summary: `最近共有 ${options.eventHistory.length} 个世界事件对战斗前后的局势造成了影响。`,
          evidence: options.eventHistory.map((event) => event.eventId).slice(0, 4),
        },
      ]
    : [
        {
          type: 'quest' as const,
          title: '任务压力仍然可见',
          summary: `当前流程仍被 ${activeQuestCount} 条进行中的任务线持续推动。`,
          evidence: options.questProgress.map(
            (quest) => `${quest.questId}:${quest.status}`,
          ),
        },
        {
          type: 'event' as const,
          title: '世界状态压力',
          summary: `最近事件历史长度为 ${options.eventHistory.length}。`,
        },
      ];

  return {
    generatedAt: options.generatedAt,
    encounterId: options.combat?.encounterId ?? latestCombatHistory?.encounterId,
    playerTags: options.playerTags,
    combatSummary,
    keyEvents,
    explanations,
    suggestions: combatSummary
      ? buildCombatSuggestions(combatSummary, combatSummary.result.result)
      : ['可以通过调试入口或任务控制器，把世界推进到更清晰的分支再做回顾。'],
  };
};
