import type {
  QuestBranchResult,
  QuestDefinition,
  QuestHistoryEntry,
  QuestObjectiveType,
  QuestProgress,
  QuestReward,
  QuestStatus,
} from '../schemas';

import { failRule, passRule, type RuleResult } from './ruleResult';

const uniqueIds = (values: string[]) => Array.from(new Set(values));

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

export interface QuestAvailabilityContext {
  definition: QuestDefinition;
  progress?: QuestProgress;
  questProgressEntries: QuestProgress[];
  worldFlags: Record<string, boolean | undefined>;
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

export interface QuestTransitionResult extends RuleResult {
  progress: QuestProgress;
  historyEntry: QuestHistoryEntry;
  reward: ReturnType<typeof mergeRewards>;
  branchResult?: QuestBranchResult;
  relationChanges: Array<{ npcId: string; delta: number }>;
  reasons: string[];
}

const hasCompletedQuest = (
  questId: string,
  progressEntries: QuestProgress[],
): boolean =>
  progressEntries.some(
    (progress) => progress.questId === questId && progress.status === 'completed',
  );

export const evaluateQuestAvailability = (
  context: QuestAvailabilityContext,
): QuestAvailabilityResult => {
  if (context.progress) {
    return {
      ...passRule('已有任务进度优先保留'),
      status: context.progress.status,
      progress: context.progress,
      reasons: ['已有任务进度优先保留'],
    };
  }

  const reasons: string[] = [];
  const unlockCondition = context.definition.unlockCondition;

  if (unlockCondition?.requiredQuestIds) {
    const missingQuestIds = unlockCondition.requiredQuestIds.filter(
      (questId) => !hasCompletedQuest(questId, context.questProgressEntries),
    );
    if (missingQuestIds.length > 0) {
      reasons.push(`缺少已完成任务：${missingQuestIds.join(', ')}`);
    }
  }

  if (unlockCondition?.requiredWorldFlags) {
    const missingFlags = unlockCondition.requiredWorldFlags.filter(
      (flag) => context.worldFlags[flag] !== true,
    );
    if (missingFlags.length > 0) {
      reasons.push(`缺少世界标记：${missingFlags.join(', ')}`);
    }
  }

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      status: 'locked',
      reasons,
    };
  }

  return {
    ...passRule('任务已满足激活条件'),
    status: 'available',
    progress: {
      questId: context.definition.id,
      status: 'available',
      currentObjectiveIndex: 0,
      completedObjectiveIds: [],
      updatedAt: context.now,
    },
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

export const applyQuestTrigger = (
  definition: QuestDefinition,
  progress: QuestProgress,
  trigger: QuestTrigger,
  now: string,
  chosenBranchId?: string,
): QuestTransitionResult => {
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

  const objective = definition.objectives[progress.currentObjectiveIndex];

  if (!objective) {
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

  const targetMatches =
    !objective.targetId ||
    !trigger.targetId ||
    objective.targetId === trigger.targetId;
  const countMatches =
    objective.requiredCount === undefined ||
    (trigger.count ?? objective.requiredCount) >= objective.requiredCount;

  if (objective.type !== trigger.type || !targetMatches || !countMatches) {
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

  const completedObjectiveIds = uniqueIds([
    ...progress.completedObjectiveIds,
    objective.id,
  ]);
  const nextObjectiveIndex = progress.currentObjectiveIndex + 1;
  const branchResult = getBranchResult(definition, chosenBranchId);
  const reward =
    nextObjectiveIndex >= definition.objectives.length
      ? mergeRewards(definition.reward, branchResult?.reward)
      : emptyReward();
  const relationChanges = branchResult?.changesNpcRelation ?? [];
  const nextStatus: QuestStatus =
    nextObjectiveIndex >= definition.objectives.length ? 'completed' : 'active';
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
      note: trigger.note,
      updatedAt: now,
    },
    reward,
    branchResult,
    relationChanges,
    reasons: ['任务推进成功'],
  };
};
