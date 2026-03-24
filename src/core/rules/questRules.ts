import type {
  EventLogEntry,
  NpcState,
  PlayerProfileTag,
  QuestBranchResult,
  QuestCondition,
  QuestDefinition,
  QuestDependency,
  QuestHistoryEntry,
  QuestObjectiveType,
  QuestProgress,
  QuestReward,
  QuestStatus,
} from '../schemas';

import { failRule, passRule, type RuleResult } from './ruleResult';

const uniqueIds = (values: string[]) => Array.from(new Set(values));

const directTriggerConditionTypes = new Set<QuestObjectiveType>([
  'talk',
  'visit',
  'collect',
  'battle',
  'trigger',
]);

const emptyReward = (): Required<
  Pick<QuestReward, 'exp' | 'gold' | 'items' | 'unlockAreaIds' | 'worldFlags'>
> => ({
  exp: 0,
  gold: 0,
  items: [],
  unlockAreaIds: [],
  worldFlags: [],
});

const mergeRewards = (
  baseReward?: QuestReward,
  branchReward?: QuestReward,
): Required<Pick<QuestReward, 'exp' | 'gold' | 'items' | 'unlockAreaIds' | 'worldFlags'>> => {
  const mergedBase = emptyReward();

  for (const reward of [baseReward, branchReward]) {
    if (!reward) {
      continue;
    }

    mergedBase.exp += reward.exp ?? 0;
    mergedBase.gold += reward.gold ?? 0;
    mergedBase.items = uniqueIds([...mergedBase.items, ...(reward.items ?? [])]);
    mergedBase.unlockAreaIds = uniqueIds([
      ...mergedBase.unlockAreaIds,
      ...(reward.unlockAreaIds ?? []),
    ]);
    mergedBase.worldFlags = uniqueIds([
      ...mergedBase.worldFlags,
      ...(reward.worldFlags ?? []),
    ]);
  }

  return mergedBase;
};

const getBranchResult = (
  definition: QuestDefinition,
  chosenBranchId?: string,
): QuestBranchResult | undefined =>
  definition.branchResults?.find((branch) => branch.id === chosenBranchId);

const buildProgress = (
  definition: QuestDefinition,
  status: QuestStatus,
  now: string,
  progress?: QuestProgress,
): QuestProgress => ({
  questId: definition.id,
  status,
  currentObjectiveIndex: progress?.currentObjectiveIndex ?? 0,
  completedObjectiveIds: progress?.completedObjectiveIds ?? [],
  chosenBranchId: progress?.chosenBranchId,
  updatedAt: now,
});

const toLegacyDependency = (dependencyQuestId: string): QuestDependency => ({
  questId: dependencyQuestId,
  requiredStatus: 'completed',
});

const toLegacyTriggerCondition = (
  definition: QuestDefinition,
  worldFlag: string,
): QuestCondition => ({
  id: `legacy:trigger:${definition.id}:${worldFlag}`,
  label: `需要世界标记 ${worldFlag}`,
  type: 'world-flag',
  targetId: worldFlag,
});

const toCompletionCondition = (
  objective: NonNullable<QuestDefinition['objectives']>[number],
): QuestCondition => ({
  id: objective.id,
  label: objective.label,
  type: objective.type,
  targetId: objective.targetId,
  requiredCount: objective.requiredCount,
});

const getDependencies = (definition: QuestDefinition): QuestDependency[] => [
  ...(definition.dependencies ?? []),
  ...((definition.unlockCondition?.requiredQuestIds ?? []).map(toLegacyDependency)),
];

const getTriggerConditions = (definition: QuestDefinition): QuestCondition[] => [
  ...(definition.triggerConditions ?? []),
  ...((definition.unlockCondition?.requiredWorldFlags ?? []).map((worldFlag) =>
    toLegacyTriggerCondition(definition, worldFlag),
  )),
];

const getCompletionConditions = (definition: QuestDefinition): QuestCondition[] => {
  if ((definition.completionConditions ?? []).length > 0) {
    return definition.completionConditions;
  }

  return (definition.objectives ?? []).map(toCompletionCondition);
};

const getFailureConditions = (definition: QuestDefinition): QuestCondition[] =>
  definition.failureConditions ?? [];

export interface QuestAvailabilityContext {
  definition: QuestDefinition;
  progress?: QuestProgress;
  questProgressEntries: QuestProgress[];
  worldFlags: Record<string, boolean | undefined>;
  currentAreaId?: string;
  visitedAreaIds?: string[];
  playerTags?: PlayerProfileTag[];
  eventHistory?: EventLogEntry[];
  npcStatesById?: Record<string, NpcState>;
  now: string;
}

export interface QuestAvailabilityResult extends RuleResult {
  status: QuestStatus;
  progress?: QuestProgress;
  reasons: string[];
}

export interface QuestTrigger {
  type: QuestObjectiveType;
  targetId?: string;
  count?: number;
  note: string;
}

export interface QuestRuleContext {
  questProgressEntries: QuestProgress[];
  worldFlags: Record<string, boolean | undefined>;
  currentAreaId?: string;
  visitedAreaIds?: string[];
  playerTags?: PlayerProfileTag[];
  eventHistory?: EventLogEntry[];
  npcStatesById?: Record<string, NpcState>;
}

interface QuestConditionEvaluationContext extends QuestRuleContext {
  trigger?: QuestTrigger;
}

export interface QuestTransitionResult extends RuleResult {
  progress: QuestProgress;
  historyEntry: QuestHistoryEntry;
  reward: ReturnType<typeof mergeRewards>;
  branchResult?: QuestBranchResult;
  relationChanges: Array<{ npcId: string; delta: number }>;
  reasons: string[];
}

export interface QuestBranchSelectionResult extends RuleResult {
  branchResult?: QuestBranchResult;
  reasons: string[];
}

const hasQuestWithStatus = (
  questId: string,
  progressEntries: QuestProgress[],
  requiredStatus: QuestStatus,
): boolean =>
  progressEntries.some(
    (progress) =>
      progress.questId === questId && progress.status === requiredStatus,
  );

const evaluateQuestCondition = (
  condition: QuestCondition,
  context: QuestConditionEvaluationContext,
): RuleResult => {
  if (directTriggerConditionTypes.has(condition.type as QuestObjectiveType)) {
    if (!context.trigger) {
      return failRule(`条件“${condition.label}”需要显式触发。`);
    }

    if (condition.type !== context.trigger.type) {
      return failRule(`条件“${condition.label}”的触发类型不匹配。`);
    }

    if (
      condition.targetId &&
      context.trigger.targetId &&
      condition.targetId !== context.trigger.targetId
    ) {
      return failRule(`条件“${condition.label}”的目标不匹配。`);
    }

    if (
      condition.requiredCount !== undefined &&
      (context.trigger.count ?? 1) < condition.requiredCount
    ) {
      return failRule(`条件“${condition.label}”的数量未满足。`);
    }

    return passRule(`条件“${condition.label}”已满足。`);
  }

  switch (condition.type) {
    case 'quest-status':
      if (
        condition.targetId &&
        hasQuestWithStatus(
          condition.targetId,
          context.questProgressEntries,
          condition.requiredStatus ?? 'completed',
        )
      ) {
        return passRule(`条件“${condition.label}”已满足。`);
      }
      return failRule(`条件“${condition.label}”尚未满足。`);
    case 'world-flag':
      if (condition.targetId && context.worldFlags[condition.targetId] === true) {
        return passRule(`条件“${condition.label}”已满足。`);
      }
      return failRule(`条件“${condition.label}”尚未满足。`);
    case 'npc-trust': {
      const currentTrust =
        (condition.targetId
          ? context.npcStatesById?.[condition.targetId]?.trust
          : undefined) ?? 0;

      if (currentTrust >= (condition.minTrust ?? 0)) {
        return passRule(`条件“${condition.label}”已满足。`);
      }

      return failRule(`条件“${condition.label}”尚未满足。`);
    }
    case 'player-tag': {
      const expectedTag = condition.playerTag;

      if (expectedTag && context.playerTags?.includes(expectedTag)) {
        return passRule(`条件“${condition.label}”已满足。`);
      }

      return failRule(`条件“${condition.label}”尚未满足。`);
    }
    case 'event':
      if (
        condition.targetId &&
        context.eventHistory?.some((entry) => entry.eventId === condition.targetId)
      ) {
        return passRule(`条件“${condition.label}”已满足。`);
      }
      return failRule(`条件“${condition.label}”尚未满足。`);
    case 'current-area':
      if (condition.targetId && context.currentAreaId === condition.targetId) {
        return passRule(`条件“${condition.label}”已满足。`);
      }
      return failRule(`条件“${condition.label}”尚未满足。`);
    case 'visited-area':
      if (condition.targetId && context.visitedAreaIds?.includes(condition.targetId)) {
        return passRule(`条件“${condition.label}”已满足。`);
      }
      return failRule(`条件“${condition.label}”尚未满足。`);
    default:
      return failRule(`条件“${condition.label}”暂不支持当前求值方式。`);
  }
};

const evaluateDependencies = (
  definition: QuestDefinition,
  context: QuestRuleContext,
): string[] =>
  getDependencies(definition)
    .filter(
      (dependency) =>
        !hasQuestWithStatus(
          dependency.questId,
          context.questProgressEntries,
          dependency.requiredStatus,
        ),
    )
    .map(
      (dependency) =>
        `依赖任务 ${dependency.questId} 尚未达到${dependency.requiredStatus}状态`,
    );

export const evaluateQuestAvailability = (
  context: QuestAvailabilityContext,
): QuestAvailabilityResult => {
  if (context.progress && context.progress.status !== 'locked') {
    return {
      ...passRule('已有任务进度优先保留'),
      status: context.progress.status,
      progress: context.progress,
      reasons: ['已有任务进度优先保留'],
    };
  }

  const reasons: string[] = [];
  reasons.push(
    ...evaluateDependencies(context.definition, {
      questProgressEntries: context.questProgressEntries,
      worldFlags: context.worldFlags,
      currentAreaId: context.currentAreaId,
      visitedAreaIds: context.visitedAreaIds,
      playerTags: context.playerTags,
      eventHistory: context.eventHistory,
      npcStatesById: context.npcStatesById,
    }),
  );

  for (const condition of getTriggerConditions(context.definition)) {
    const conditionResult = evaluateQuestCondition(condition, {
      questProgressEntries: context.questProgressEntries,
      worldFlags: context.worldFlags,
      currentAreaId: context.currentAreaId,
      visitedAreaIds: context.visitedAreaIds,
      playerTags: context.playerTags,
      eventHistory: context.eventHistory,
      npcStatesById: context.npcStatesById,
    });

    if (!conditionResult.ok) {
      reasons.push(conditionResult.reason ?? `条件“${condition.label}”未满足。`);
    }
  }

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      status: 'locked',
      progress: buildProgress(
        context.definition,
        'locked',
        context.now,
        context.progress,
      ),
      reasons,
    };
  }

  return {
    ...passRule('任务已满足激活条件'),
    status: 'available',
    progress: buildProgress(
      context.definition,
      'available',
      context.now,
      context.progress,
    ),
    reasons: ['任务已满足激活条件'],
  };
};

export const activateQuest = (
  definition: QuestDefinition,
  progress: QuestProgress | undefined,
  now: string,
): QuestTransitionResult => {
  const availability = evaluateQuestAvailability({
    definition,
    progress,
    questProgressEntries: progress ? [progress] : [],
    worldFlags: {},
    now,
  });

  if (!availability.ok || !availability.progress) {
    const fallbackProgress =
      progress ??
      ({
        questId: definition.id,
        status: 'locked',
        currentObjectiveIndex: 0,
        completedObjectiveIds: [],
        updatedAt: now,
      } satisfies QuestProgress);

    return {
      ...failRule(availability.reason ?? '任务当前不可用'),
      progress: fallbackProgress,
      historyEntry: {
        questId: definition.id,
        status: fallbackProgress.status,
        note: availability.reason ?? '任务激活失败',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: availability.reasons,
    };
  }

  if (availability.progress.status !== 'available') {
    return {
      ...failRule('任务当前无法再次被激活'),
      progress: availability.progress,
      historyEntry: {
        questId: definition.id,
        status: availability.progress.status,
        note: '任务已处于当前状态，无需重复激活。',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: ['任务当前无法再次被激活'],
    };
  }

  const nextProgress: QuestProgress = {
    ...availability.progress,
    status: 'active',
    updatedAt: now,
  };

  return {
    ...passRule('任务已激活'),
    progress: nextProgress,
    historyEntry: {
      questId: definition.id,
      status: nextProgress.status,
      note: `任务“${definition.title}”现已激活。`,
      updatedAt: now,
    },
    reward: emptyReward(),
    relationChanges: [],
    reasons: ['任务已激活'],
  };
};

const resolveBranchSelection = (
  definition: QuestDefinition,
  chosenBranchId: string | undefined,
  context: QuestRuleContext,
): QuestBranchSelectionResult => {
  if (!chosenBranchId) {
    return {
      ...passRule('当前未选择任务分支'),
      reasons: ['当前未选择任务分支'],
    };
  }

  const branchResult = getBranchResult(definition, chosenBranchId);

  if (!branchResult) {
    return {
      ...failRule(`未找到任务分支 ${chosenBranchId}`),
      reasons: [`未找到任务分支 ${chosenBranchId}`],
    };
  }

  const reasons = branchResult.activationConditions
    .map((condition) => evaluateQuestCondition(condition, context))
    .filter((result) => !result.ok)
    .map((result) => result.reason ?? '任务分支条件未满足');

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      reasons,
    };
  }

  return {
    ...passRule(`任务分支“${branchResult.label}”可用`),
    branchResult,
    reasons: [`任务分支“${branchResult.label}”可用`],
  };
};

export const evaluateQuestBranchSelection = resolveBranchSelection;

export const evaluateQuestFailure = (
  definition: QuestDefinition,
  progress: QuestProgress,
  context: QuestRuleContext,
  now: string,
): QuestTransitionResult | null => {
  if (progress.status !== 'active') {
    return null;
  }

  for (const condition of getFailureConditions(definition)) {
    const result = evaluateQuestCondition(condition, context);

    if (result.ok) {
      const failedProgress: QuestProgress = {
        ...progress,
        status: 'failed',
        updatedAt: now,
      };

      return {
        ...failRule(`任务因“${condition.label}”而失败`),
        progress: failedProgress,
        historyEntry: {
          questId: definition.id,
          status: failedProgress.status,
          note: `任务因“${condition.label}”而失败。`,
          conditionId: condition.id,
          updatedAt: now,
        },
        reward: emptyReward(),
        relationChanges: [],
        reasons: [`任务因“${condition.label}”而失败`],
      };
    }
  }

  return null;
};

const buildTransitionResult = (
  definition: QuestDefinition,
  progress: QuestProgress,
  condition: QuestCondition,
  note: string,
  now: string,
  chosenBranchId: string | undefined,
  context: QuestRuleContext,
): QuestTransitionResult => {
  const completionConditions = getCompletionConditions(definition);
  const completedObjectiveIds = uniqueIds([
    ...progress.completedObjectiveIds,
    condition.id,
  ]);
  const nextObjectiveIndex = progress.currentObjectiveIndex + 1;
  const isCompleted = nextObjectiveIndex >= completionConditions.length;
  const branchSelection = isCompleted
    ? resolveBranchSelection(definition, chosenBranchId, context)
    : ({
        ...passRule('任务尚未进入分支结算'),
        reasons: ['任务尚未进入分支结算'],
      } satisfies QuestBranchSelectionResult);

  if (!branchSelection.ok) {
    return {
      ...failRule(branchSelection.reason ?? '任务分支条件未满足'),
      progress,
      historyEntry: {
        questId: definition.id,
        status: progress.status,
        note: branchSelection.reason ?? '任务分支条件未满足。',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: branchSelection.reasons,
    };
  }

  const reward = isCompleted
    ? mergeRewards(definition.reward, branchSelection.branchResult?.reward)
    : emptyReward();

  reward.worldFlags = uniqueIds([
    ...reward.worldFlags,
    ...(branchSelection.branchResult?.setsWorldFlags ?? []),
  ]);

  const nextStatus: QuestStatus = isCompleted ? 'completed' : 'active';
  const nextProgress: QuestProgress = {
    ...progress,
    status: nextStatus,
    currentObjectiveIndex: nextObjectiveIndex,
    completedObjectiveIds,
    chosenBranchId,
    updatedAt: now,
  };

  return {
    ...passRule('任务推进成功'),
    progress: nextProgress,
    historyEntry: {
      questId: definition.id,
      status: nextStatus,
      note,
      conditionId: condition.id,
      branchId: branchSelection.branchResult?.id,
      updatedAt: now,
    },
    reward,
    branchResult: branchSelection.branchResult,
    relationChanges: branchSelection.branchResult?.changesNpcRelation ?? [],
    reasons: ['任务推进成功'],
  };
};

export const applyQuestTrigger = (
  definition: QuestDefinition,
  progress: QuestProgress,
  trigger: QuestTrigger,
  now: string,
  chosenBranchId?: string,
  context: QuestRuleContext = {
    questProgressEntries: [],
    worldFlags: {},
  },
): QuestTransitionResult => {
  const failureResult = evaluateQuestFailure(
    definition,
    progress,
    context,
    now,
  );

  if (failureResult) {
    return failureResult;
  }

  if (progress.status !== 'active') {
    return {
      ...failRule('任务当前未处于进行中状态'),
      progress,
      historyEntry: {
        questId: definition.id,
        status: progress.status,
        note: '任务触发已忽略，因为该任务当前并未处于进行中状态。',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: ['任务当前未处于进行中状态'],
    };
  }

  const currentCondition =
    getCompletionConditions(definition)[progress.currentObjectiveIndex];

  if (!currentCondition) {
    return {
      ...failRule('任务已没有剩余目标'),
      progress,
      historyEntry: {
        questId: definition.id,
        status: progress.status,
        note: '任务触发已忽略，因为已经没有剩余目标。',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: ['任务已没有剩余目标'],
    };
  }

  const conditionResult = evaluateQuestCondition(currentCondition, {
    ...context,
    trigger,
  });

  if (!conditionResult.ok) {
    return {
      ...failRule('任务触发与当前激活目标不匹配'),
      progress,
      historyEntry: {
        questId: definition.id,
        status: progress.status,
        note: '任务触发未命中当前激活目标。',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: ['任务触发与当前激活目标不匹配'],
    };
  }

  return buildTransitionResult(
    definition,
    progress,
    currentCondition,
    trigger.note,
    now,
    chosenBranchId,
    context,
  );
};
