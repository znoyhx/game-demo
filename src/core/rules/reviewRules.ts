import type {
  CombatCommandAction,
  CombatEncounterDefinition,
  CombatHistoryEntry,
  CombatPhaseChange,
  CombatPlayerBehaviorSummary,
  CombatResult,
  CombatState,
  CombatTacticChange,
  DifficultyLevel,
  EventLogEntry,
  ExplanationItem,
  PlayerModelState,
  PlayerProfileTag,
  PlayerState,
  QuestProgress,
  ReviewCombatSummary,
  ReviewEnemyTacticReason,
  ReviewKnowledgeSummary,
  ReviewNpcAttitudeReason,
  ReviewOutcomeFactor,
  ReviewPayload,
  ReviewQuestBranchReason,
  ReviewRequest,
} from '../schemas';
import {
  formatCombatResultLabel,
  formatEnemyTacticLabel,
  formatPlayerTagLabel,
} from '../utils/displayLabels';
import { resolvePlayerDifficultyAdjustment } from './playerModelRules';

const combatActionLabels: Record<CombatCommandAction, string> = {
  attack: '攻击',
  guard: '防御',
  heal: '治疗',
  analyze: '分析',
  special: '特技',
  retreat: '撤退',
};

const uniqueStrings = (entries: Array<string | undefined | null>) =>
  Array.from(
    new Set(
      entries
        .map((entry) => entry?.trim())
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );

const takeUniqueBy = <T>(
  entries: T[],
  getKey: (entry: T) => string,
  limit?: number,
) => {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const entry of entries) {
    const key = getKey(entry);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(entry);

    if (limit && output.length >= limit) {
      break;
    }
  }

  return output;
};

const getEncounterPhaseLabel = (
  encounter: CombatEncounterDefinition | null | undefined,
  phaseId: string | undefined,
) => {
  if (!phaseId) {
    return '未命名阶段';
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

const getDominantPlayerAction = (
  combatSummary: ReviewCombatSummary | null,
): CombatCommandAction | null =>
  (combatSummary?.keyPlayerBehaviors[0]?.actionType as CombatCommandAction | undefined) ??
  null;

const getTriggerLabel = (trigger: ReviewRequest['trigger']) => {
  switch (trigger) {
    case 'combat':
      return '战斗后复盘';
    case 'quest-branch':
      return '任务分支解释';
    case 'npc-interaction':
      return '角色互动解释';
    case 'run-complete':
      return '通关复盘';
    case 'run-failed':
      return '失败复盘';
    case 'manual':
    default:
      return '手动回顾';
  }
};

const collectFromReviewHistory = <T>(
  reviewHistory: ReviewPayload[],
  pick: (review: ReviewPayload) => T[],
) => [...reviewHistory].reverse().flatMap((review) => pick(review));

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
        summary: `第 ${log.turn} 回合，敌方从“${formatEnemyTacticLabel(
          previousTactic,
        )}”切换为“${formatEnemyTacticLabel(log.activeTactic)}”，当时处于“${phaseLabel}”。`,
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
        summary: `第 ${log.turn} 回合，首领从“${getEncounterPhaseLabel(
          encounter,
          previousPhaseId,
        )}”进入“${getEncounterPhaseLabel(encounter, log.phaseId)}”。`,
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
      summary: `玩家在本场战斗中共使用“${combatActionLabels[actionType]}”${stats.count} 次。`,
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
  playerRemainingHp: options.combatState.player.hp,
  enemyRemainingHp: options.combatState.enemy.hp,
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
      summary: `本场战斗以“${formatCombatResultLabel(
        options.combatState.result,
      )}”结束，共进行了 ${getCompletedTurnCount(
        options.combatState,
      )} 回合，敌方最终保持“${formatEnemyTacticLabel(
        options.combatState.activeTactic,
      )}”节奏。`,
    },
    tacticChanges: summarizeCombatTacticChanges(options.combatState, options.encounter),
    phaseChanges: summarizeCombatPhaseChanges(options.combatState, options.encounter),
    keyPlayerBehaviors: summarizeCombatPlayerBehaviors(options.combatState),
  };
};

export const buildCombatReviewSummaryFromHistory = (options: {
  encounter?: CombatEncounterDefinition | null;
  combatHistoryEntry: CombatHistoryEntry;
  player?: PlayerState | null;
}): ReviewCombatSummary => {
  const { combatHistoryEntry } = options;
  const playerRemainingHp =
    combatHistoryEntry.playerRemainingHp ??
    (combatHistoryEntry.result === 'defeat'
      ? 0
      : Math.max(0, options.player?.hp ?? 0));
  const enemyRemainingHp =
    combatHistoryEntry.enemyRemainingHp ??
    (combatHistoryEntry.result === 'victory' ? 0 : 1);

  return {
    result: {
      result: combatHistoryEntry.result,
      totalTurns: combatHistoryEntry.turnCount,
      finalTactic: combatHistoryEntry.finalTactic,
      finalPhaseId: combatHistoryEntry.finalPhaseId,
      playerRemainingHp,
      enemyRemainingHp,
      summary: `战斗以${formatCombatResultLabel(
        combatHistoryEntry.result,
      )}结束，共持续 ${combatHistoryEntry.turnCount} 回合，敌方最终战术为${formatEnemyTacticLabel(
        combatHistoryEntry.finalTactic,
      )}。`,
    },
    tacticChanges: combatHistoryEntry.tacticChanges,
    phaseChanges: combatHistoryEntry.phaseChanges,
    keyPlayerBehaviors: combatHistoryEntry.keyPlayerBehaviors,
  };
};

const buildPlayerModelExplanation = (options: {
  playerTags: PlayerProfileTag[];
  playerModel: PlayerModelState;
  difficulty: DifficultyLevel;
}): ExplanationItem => {
  const difficultyAdjustment = resolvePlayerDifficultyAdjustment(
    options.playerModel,
    options.difficulty,
  );
  const styleLabel =
    options.playerModel.dominantStyle
      ? formatPlayerTagLabel(options.playerModel.dominantStyle)
      : '未定型';

  return {
    type: 'playerModel',
    title: '当前玩家画像',
    summary: `当前主导画像为“${styleLabel}”，系统会据此采用“${difficultyAdjustment.label}”并调整提示、战术与关系反馈。`,
    evidence: uniqueStrings([
      ...options.playerModel.rationale.slice(0, 2),
      difficultyAdjustment.summary,
      options.playerModel.riskForecast,
      options.playerModel.stuckPoint,
      options.playerTags.length > 0
        ? `当前标签：${options.playerTags.map(formatPlayerTagLabel).join('、')}`
        : '当前标签尚不明显',
    ]),
  };
};

const buildQuestBranchReasons = (options: {
  reviewRequest: ReviewRequest;
  reviewHistory: ReviewPayload[];
}) => {
  const current =
    options.reviewRequest.questBranch !== undefined
      ? [options.reviewRequest.questBranch]
      : [];
  const fromHistory = collectFromReviewHistory(
    options.reviewHistory,
    (review) => review.questBranchReasons ?? [],
  );

  return takeUniqueBy<ReviewQuestBranchReason>(
    [...current, ...fromHistory],
    (entry) => `${entry.questId}:${entry.branchId ?? entry.status}`,
    3,
  );
};

const buildNpcAttitudeReasons = (options: {
  reviewRequest: ReviewRequest;
  reviewHistory: ReviewPayload[];
}) => {
  const current: ReviewNpcAttitudeReason[] = [];

  if (options.reviewRequest.npcInteraction) {
    const interaction = options.reviewRequest.npcInteraction;
    const explanation = interaction.explanation;
    const reasons = uniqueStrings([
      ...explanation.trust.reasons,
      ...explanation.relationship.reasons,
      ...explanation.decisionBasis,
    ]);
    const summaryParts = uniqueStrings([
      explanation.trust.delta !== 0
        ? `信任 ${explanation.trust.delta >= 0 ? '+' : ''}${explanation.trust.delta}`
        : undefined,
      explanation.relationship.delta !== 0
        ? `关系 ${explanation.relationship.delta >= 0 ? '+' : ''}${explanation.relationship.delta}`
        : undefined,
      explanation.debugSummary,
    ]);

    current.push({
      npcId: interaction.npcId,
      npcName: interaction.npcName,
      attitudeLabel: explanation.attitudeLabel,
      emotionalStateLabel: explanation.emotionalStateLabel,
      trustDelta: explanation.trust.delta,
      relationshipDelta: explanation.relationship.delta,
      summary:
        summaryParts.join('；') ||
        `${interaction.npcName} 的态度与情绪已更新为“${explanation.attitudeLabel} / ${explanation.emotionalStateLabel}”。`,
      reasons,
      decisionBasis: explanation.decisionBasis,
    });
  }

  const fromHistory = collectFromReviewHistory(
    options.reviewHistory,
    (review) => review.npcAttitudeReasons ?? [],
  );

  return takeUniqueBy<ReviewNpcAttitudeReason>(
    [...current, ...fromHistory],
    (entry) => entry.npcId,
    3,
  );
};

const buildTacticReasonList = (options: {
  encounter?: CombatEncounterDefinition | null;
  combatSummary: ReviewCombatSummary;
  playerTags: PlayerProfileTag[];
}): ReviewEnemyTacticReason[] => {
  const dominantAction = getDominantPlayerAction(options.combatSummary);

  return options.combatSummary.tacticChanges.map((change) => {
    const reasons = uniqueStrings([
      options.encounter?.bossPhases?.find((phase) => phase.id === change.phaseId)?.tacticBias?.includes(
        change.toTactic,
      )
        ? `“${getEncounterPhaseLabel(
            options.encounter,
            change.phaseId,
          )}”阶段天然更偏向“${formatEnemyTacticLabel(change.toTactic)}”。`
        : undefined,
      dominantAction &&
      (dominantAction === 'attack' || dominantAction === 'special') &&
      change.toTactic === 'counter'
        ? '玩家连续采用正面强压动作，敌方转入反制以惩罚重复输出。'
        : undefined,
      dominantAction === 'heal' && change.toTactic === 'trap'
        ? '玩家在恢复回合暴露节奏，敌方改用陷阱来放大停顿。'
        : undefined,
      dominantAction === 'attack' && change.toTactic === 'defensive'
        ? '玩家进攻频率过高，敌方用防守拖慢你的推进速度。'
        : undefined,
      change.toTactic === 'summon'
        ? '敌方需要扩大战场压力，于是转向召唤支援。'
        : undefined,
      change.toTactic === 'resource-lock'
        ? '敌方开始压制资源与技能窗口，逼迫你提前交出解法。'
        : undefined,
      options.playerTags.includes('risky') && change.toTactic === 'counter'
        ? '玩家画像呈现高风险倾向，敌方更容易选择反制型策略。'
        : undefined,
      options.playerTags.includes('cautious') && change.toTactic === 'trap'
        ? '玩家较谨慎时常会停顿观察，敌方会尝试用陷阱逼出失误。'
        : undefined,
      `敌方试图通过“${formatEnemyTacticLabel(change.toTactic)}”打断当前回合节奏。`,
    ]);

    return {
      turn: change.turn,
      fromTactic: change.fromTactic,
      toTactic: change.toTactic,
      phaseId: change.phaseId,
      summary: `第 ${change.turn} 回合敌方切到“${formatEnemyTacticLabel(
        change.toTactic,
      )}”，核心原因是${reasons[0] ?? '需要改变当前节奏'}。`,
      reasons,
    };
  });
};

const buildEnemyTacticReasons = (options: {
  encounter?: CombatEncounterDefinition | null;
  combatSummary: ReviewCombatSummary | null;
  playerTags: PlayerProfileTag[];
  reviewHistory: ReviewPayload[];
}) => {
  const current = options.combatSummary
    ? buildTacticReasonList({
        encounter: options.encounter,
        combatSummary: options.combatSummary,
        playerTags: options.playerTags,
      })
    : [];
  const fromHistory = collectFromReviewHistory(
    options.reviewHistory,
    (review) => review.enemyTacticReasons ?? [],
  );

  return takeUniqueBy<ReviewEnemyTacticReason>(
    [...current, ...fromHistory],
    (entry) => `${entry.turn}:${entry.toTactic}:${entry.phaseId ?? 'none'}`,
    4,
  );
};

const buildCombatOutcomeFactors = (options: {
  combatSummary: ReviewCombatSummary;
  enemyTacticReasons: ReviewEnemyTacticReason[];
  playerModel: PlayerModelState;
}): ReviewOutcomeFactor[] => {
  const dominantBehavior = options.combatSummary.keyPlayerBehaviors[0];
  const factors: ReviewOutcomeFactor[] = [];

  if (options.combatSummary.result.result === 'victory') {
    factors.push({
      kind: 'success',
      title: '战斗结果',
      summary: '你成功读懂了阶段与战术切换，并在关键窗口完成了推进。',
      evidence: uniqueStrings([
        options.combatSummary.result.summary,
        options.enemyTacticReasons[0]?.summary,
      ]),
    });
  } else {
    factors.push({
      kind: 'failure',
      title: '战斗结果',
      summary: '失败主要来自节奏判断与敌方策略应对不匹配。',
      evidence: uniqueStrings([
        options.combatSummary.result.summary,
        options.enemyTacticReasons[0]?.summary,
      ]),
    });
  }

  if (dominantBehavior) {
    factors.push({
      kind:
        dominantBehavior.actionType === 'attack' ||
        dominantBehavior.actionType === 'special'
          ? 'risk'
          : 'opportunity',
      title: '玩家常用动作',
      summary: `本场最明显的行为模式是“${combatActionLabels[dominantBehavior.actionType]}”，它直接影响了敌方的应对方式。`,
      evidence: options.combatSummary.keyPlayerBehaviors.map((behavior) => behavior.summary),
    });
  }

  if (options.combatSummary.phaseChanges.length > 0) {
    factors.push({
      kind: 'opportunity',
      title: '阶段切换窗口',
      summary: '阶段切换既是风险点，也是最适合提前备招的窗口。',
      evidence: options.combatSummary.phaseChanges.map((change) => change.summary),
    });
  }

  if (options.playerModel.riskForecast) {
    factors.push({
      kind: 'risk',
      title: '玩家画像提示',
      summary: options.playerModel.riskForecast,
      evidence: options.playerModel.rationale.slice(0, 2),
    });
  }

  return factors;
};

const buildQuestOutcomeFactors = (
  questBranchReasons: ReviewQuestBranchReason[],
): ReviewOutcomeFactor[] =>
  questBranchReasons.slice(0, 2).map((item) => ({
    kind: 'opportunity',
    title: `任务分支：${item.questTitle}`,
    summary: item.summary,
    evidence: item.reasons,
  }));

const buildNpcOutcomeFactors = (
  npcAttitudeReasons: ReviewNpcAttitudeReason[],
): ReviewOutcomeFactor[] =>
  npcAttitudeReasons.slice(0, 2).map((item) => ({
    kind:
      item.trustDelta < 0 || item.relationshipDelta < 0 ? 'risk' : 'success',
    title: `角色态度：${item.npcName}`,
    summary: item.summary,
    evidence: uniqueStrings([...item.reasons, ...item.decisionBasis]),
  }));

const buildRunOutcomeFactors = (options: {
  reviewRequest: ReviewRequest;
  questProgress: QuestProgress[];
}): ReviewOutcomeFactor[] => {
  if (!options.reviewRequest.runOutcome) {
    return [];
  }

  const completedQuestCount = options.questProgress.filter(
    (quest) => quest.status === 'completed',
  ).length;
  const failedQuestCount = options.questProgress.filter(
    (quest) => quest.status === 'failed',
  ).length;

  return [
    {
      kind:
        options.reviewRequest.runOutcome.result === 'completed'
          ? 'success'
          : 'failure',
      title:
        options.reviewRequest.runOutcome.result === 'completed'
          ? '本轮结果'
          : '失败结论',
      summary: options.reviewRequest.runOutcome.summary,
      evidence: uniqueStrings([
        ...options.reviewRequest.runOutcome.reasons,
        `已完成任务 ${completedQuestCount} 条`,
        failedQuestCount > 0 ? `失败任务 ${failedQuestCount} 条` : undefined,
      ]),
    },
  ];
};

const buildOutcomeFactors = (options: {
  reviewRequest: ReviewRequest;
  combatSummary: ReviewCombatSummary | null;
  enemyTacticReasons: ReviewEnemyTacticReason[];
  questBranchReasons: ReviewQuestBranchReason[];
  npcAttitudeReasons: ReviewNpcAttitudeReason[];
  playerModel: PlayerModelState;
  questProgress: QuestProgress[];
}) => {
  const factors = [
    ...(options.combatSummary
      ? buildCombatOutcomeFactors({
          combatSummary: options.combatSummary,
          enemyTacticReasons: options.enemyTacticReasons,
          playerModel: options.playerModel,
        })
      : []),
    ...buildQuestOutcomeFactors(options.questBranchReasons),
    ...buildNpcOutcomeFactors(options.npcAttitudeReasons),
    ...buildRunOutcomeFactors({
      reviewRequest: options.reviewRequest,
      questProgress: options.questProgress,
    }),
  ];

  return takeUniqueBy<ReviewOutcomeFactor>(factors, (entry) => entry.title, 5);
};

const buildCombatSuggestions = (
  combatSummary: ReviewCombatSummary,
  result: CombatResult,
  playerModel?: PlayerModelState,
) => {
  const suggestions = new Set<string>();

  switch (combatSummary.result.finalTactic) {
    case 'aggressive':
      suggestions.add(
        '下次遇到高压冲锋时，优先保留防御或恢复资源，不要把爆发全部压在同一回合。',
      );
      break;
    case 'defensive':
      suggestions.add(
        '面对防守型敌人时，可以先用分析或资源消耗逼出换招，再决定爆发时机。',
      );
      break;
    case 'counter':
      suggestions.add(
        '面对反制型敌人时，不要连续重复同一种高压动作，适当穿插防御和分析会更稳。',
      );
      break;
    case 'trap':
      suggestions.add(
        '面对陷阱型敌人时，优先确认阶段变化与环境提示，再决定是否继续前压。',
      );
      break;
    case 'summon':
      suggestions.add(
        '面对召唤型敌人时，先清理额外威胁或打断节奏，再回头处理首领主体。',
      );
      break;
    case 'resource-lock':
      suggestions.add(
        '面对资源压制时，保留关键能量并避免过早交出全部技能资源。',
      );
      break;
    default:
      break;
  }

  if (combatSummary.phaseChanges.length > 0) {
    suggestions.add(
      '阶段切换前后通常会改变战术偏好，下次可提前为换阶段预留资源。',
    );
  }

  if (combatSummary.keyPlayerBehaviors[0]?.actionType === 'attack') {
    suggestions.add(
      '你本场偏爱直接攻击，若想降低被反制概率，可以在进攻回合之间穿插观察或防御。',
    );
  }

  if (result === 'defeat') {
    suggestions.add(
      '这场失败更像是节奏判断失误，建议先看复盘中的阶段与战术切换再调整打法。',
    );
  }

  if (result === 'victory') {
    suggestions.add(
      '这场胜利已经验证了你的有效节奏，下一次可在相似阶段继续沿用并微调。',
    );
  }

  if (playerModel?.stuckPoint) {
    suggestions.add(playerModel.stuckPoint);
  }

  return [...suggestions];
};

const buildQuestSuggestions = (
  questBranchReasons: ReviewQuestBranchReason[],
): string[] =>
  questBranchReasons.slice(0, 2).map((item) =>
    item.branchLabel
      ? `优先沿“${item.branchLabel}”分支继续推进，并围绕当前理由去补齐相关条件。`
      : `围绕“${item.questTitle}”继续推进，先验证最近一次分支变化带来的影响。`,
  );

const buildNpcSuggestions = (
  npcAttitudeReasons: ReviewNpcAttitudeReason[],
): string[] =>
  npcAttitudeReasons.slice(0, 2).map((item) => {
    if (item.trustDelta < 0 || item.relationshipDelta < 0) {
      return `和 ${item.npcName} 继续推进前，先用更稳妥的问候、交易或任务反馈修复关系。`;
    }

    return `趁 ${item.npcName} 当前态度转好，优先继续追问线索或承接其后续任务。`;
  });

const buildRunSuggestions = (reviewRequest: ReviewRequest): string[] => {
  if (!reviewRequest.runOutcome) {
    return [];
  }

  return reviewRequest.runOutcome.result === 'completed'
    ? [
        '可切换到教育模式，把这轮成功路线拆成任务推进、关系建立与战术判断三个知识点继续讲解。',
      ]
    : [
        '建议先从失败复盘页回看任务分支、NPC 态度与战术切换，再决定要重开哪一段流程。',
      ];
};

const buildNextStepSuggestions = (options: {
  combatSummary: ReviewCombatSummary | null;
  questBranchReasons: ReviewQuestBranchReason[];
  npcAttitudeReasons: ReviewNpcAttitudeReason[];
  reviewRequest: ReviewRequest;
  playerModel: PlayerModelState;
}) => {
  const suggestions = uniqueStrings([
    ...(options.combatSummary
      ? buildCombatSuggestions(
          options.combatSummary,
          options.combatSummary.result.result,
          options.playerModel,
        )
      : []),
    ...buildQuestSuggestions(options.questBranchReasons),
    ...buildNpcSuggestions(options.npcAttitudeReasons),
    ...buildRunSuggestions(options.reviewRequest),
    options.playerModel.stuckPoint,
  ]);

  return suggestions.slice(0, 5);
};

const buildKnowledgeSummary = (options: {
  reviewRequest: ReviewRequest;
  playerTags: PlayerProfileTag[];
  questBranchReasons: ReviewQuestBranchReason[];
  npcAttitudeReasons: ReviewNpcAttitudeReason[];
  enemyTacticReasons: ReviewEnemyTacticReason[];
  outcomeFactors: ReviewOutcomeFactor[];
}): ReviewKnowledgeSummary => ({
  extensionKey: 'education-mode',
  title: `${getTriggerLabel(options.reviewRequest.trigger)}知识点`,
  summary:
    '这份结构化总结可以直接作为教育模式的讲解入口，用来解释玩家画像、任务因果、关系变化与敌方策略。',
  keyPoints: uniqueStrings([
    options.playerTags.length > 0
      ? `当前玩家画像：${options.playerTags.map(formatPlayerTagLabel).join('、')}`
      : '当前玩家画像尚未形成明显标签',
    options.questBranchReasons[0]?.summary,
    options.npcAttitudeReasons[0]?.summary,
    options.enemyTacticReasons[0]?.summary,
    options.outcomeFactors[0]?.summary,
  ]).slice(0, 4),
  suggestedPrompt:
    options.reviewRequest.trigger === 'combat'
      ? '可继续追问：如果玩家改用更谨慎的行动节奏，敌方会如何调整策略？'
      : options.reviewRequest.trigger === 'quest-branch'
        ? '可继续追问：如果选择另一条分支，世界与角色关系会如何变化？'
        : '可继续追问：这次关系或结果变化背后的关键因果链是什么？',
});

const buildKeyEvents = (options: {
  reviewRequest: ReviewRequest;
  combatSummary: ReviewCombatSummary | null;
  questBranchReasons: ReviewQuestBranchReason[];
  npcAttitudeReasons: ReviewNpcAttitudeReason[];
  playerModel: PlayerModelState;
  questProgress: QuestProgress[];
  eventHistory: EventLogEntry[];
}) => {
  const activeQuestCount = options.questProgress.filter(
    (quest) => quest.status === 'active',
  ).length;
  const completedQuestCount = options.questProgress.filter(
    (quest) => quest.status === 'completed',
  ).length;

  return uniqueStrings([
    `${getTriggerLabel(options.reviewRequest.trigger)}已生成。`,
    options.reviewRequest.runOutcome?.summary,
    options.combatSummary?.result.summary,
    options.questBranchReasons[0]?.summary,
    options.npcAttitudeReasons[0]?.summary,
    `已完成任务 ${completedQuestCount} 条，进行中任务 ${activeQuestCount} 条。`,
    options.playerModel.dominantStyle
      ? `当前主导画像为“${formatPlayerTagLabel(options.playerModel.dominantStyle)}”。`
      : undefined,
    options.eventHistory.length > 0
      ? `累计记录世界事件 ${options.eventHistory.length} 条。`
      : undefined,
  ]).slice(0, 6);
};

const buildExplanations = (options: {
  playerTags: PlayerProfileTag[];
  playerModel: PlayerModelState;
  difficulty: DifficultyLevel;
  questBranchReasons: ReviewQuestBranchReason[];
  npcAttitudeReasons: ReviewNpcAttitudeReason[];
  enemyTacticReasons: ReviewEnemyTacticReason[];
  eventHistory: EventLogEntry[];
}) => {
  const explanations: ExplanationItem[] = [
    buildPlayerModelExplanation({
      playerTags: options.playerTags,
      playerModel: options.playerModel,
      difficulty: options.difficulty,
    }),
    ...options.questBranchReasons.slice(0, 2).map((item) => ({
      type: 'quest' as const,
      title: `任务分支：${item.questTitle}`,
      summary: item.summary,
      evidence: item.reasons,
    })),
    ...options.npcAttitudeReasons.slice(0, 2).map((item) => ({
      type: 'npc' as const,
      title: `角色态度：${item.npcName}`,
      summary: item.summary,
      evidence: uniqueStrings([...item.reasons, ...item.decisionBasis]),
    })),
  ];

  if (options.enemyTacticReasons.length > 0) {
    explanations.push({
      type: 'combat',
      title: '敌方策略变化',
      summary: `本轮共识别到 ${options.enemyTacticReasons.length} 条关键战术变化原因。`,
      evidence: options.enemyTacticReasons.map((item) => item.summary),
    });
  }

  explanations.push({
    type: 'event',
    title: '事件与记录',
    summary: `当前已累积 ${options.eventHistory.length} 条世界事件记录，可用于调试与回放。`,
    evidence: options.eventHistory
      .slice(-4)
      .map((entry) => `${entry.eventId}（${entry.source}）`),
  });

  return explanations;
};

export const buildReviewPayload = (options: {
  generatedAt: string;
  player?: PlayerState | null;
  playerTags: PlayerProfileTag[];
  playerModel: PlayerModelState;
  difficulty: DifficultyLevel;
  reviewRequest: ReviewRequest;
  reviewHistory: ReviewPayload[];
  encounter?: CombatEncounterDefinition | null;
  combat?: CombatState | null;
  combatHistory?: CombatHistoryEntry[];
  questProgress: QuestProgress[];
  eventHistory: EventLogEntry[];
}): ReviewPayload => {
  const latestCombatHistory =
    options.combatHistory?.[options.combatHistory.length - 1] ?? null;
  const combatSummary = options.combat
    ? buildCombatReviewSummary({
        encounter: options.encounter,
        combatState: options.combat,
      })
    : options.reviewRequest.trigger === 'combat' && latestCombatHistory
      ? buildCombatReviewSummaryFromHistory({
          encounter: options.encounter,
          combatHistoryEntry: latestCombatHistory,
          player: options.player,
        })
      : null;
  const questBranchReasons = buildQuestBranchReasons({
    reviewRequest: options.reviewRequest,
    reviewHistory: options.reviewHistory,
  });
  const npcAttitudeReasons = buildNpcAttitudeReasons({
    reviewRequest: options.reviewRequest,
    reviewHistory: options.reviewHistory,
  });
  const enemyTacticReasons = buildEnemyTacticReasons({
    encounter: options.encounter,
    combatSummary,
    playerTags: options.playerTags,
    reviewHistory: options.reviewHistory,
  });
  const outcomeFactors = buildOutcomeFactors({
    reviewRequest: options.reviewRequest,
    combatSummary,
    enemyTacticReasons,
    questBranchReasons,
    npcAttitudeReasons,
    playerModel: options.playerModel,
    questProgress: options.questProgress,
  });
  const nextStepSuggestions = buildNextStepSuggestions({
    combatSummary,
    questBranchReasons,
    npcAttitudeReasons,
    reviewRequest: options.reviewRequest,
    playerModel: options.playerModel,
  });
  const knowledgeSummary = buildKnowledgeSummary({
    reviewRequest: options.reviewRequest,
    playerTags: options.playerTags,
    questBranchReasons,
    npcAttitudeReasons,
    enemyTacticReasons,
    outcomeFactors,
  });
  const explanations = buildExplanations({
    playerTags: options.playerTags,
    playerModel: options.playerModel,
    difficulty: options.difficulty,
    questBranchReasons,
    npcAttitudeReasons,
    enemyTacticReasons,
    eventHistory: options.eventHistory,
  });
  const keyEvents = buildKeyEvents({
    reviewRequest: options.reviewRequest,
    combatSummary,
    questBranchReasons,
    npcAttitudeReasons,
    playerModel: options.playerModel,
    questProgress: options.questProgress,
    eventHistory: options.eventHistory,
  });

  return {
    generatedAt: options.generatedAt,
    trigger: options.reviewRequest.trigger,
    encounterId: options.combat?.encounterId ?? latestCombatHistory?.encounterId,
    playerTags: options.playerTags,
    playerModelSnapshot: {
      tags: options.playerModel.tags,
      dominantStyle: options.playerModel.dominantStyle,
      rationale: options.playerModel.rationale,
      riskForecast: options.playerModel.riskForecast,
      stuckPoint: options.playerModel.stuckPoint,
      debugProfile: options.playerModel.debugProfile,
    },
    combatSummary,
    questBranchReasons,
    npcAttitudeReasons,
    enemyTacticReasons,
    outcomeFactors,
    keyEvents,
    nextStepSuggestions,
    knowledgeSummary,
    explanations,
    suggestions: nextStepSuggestions,
  };
};
