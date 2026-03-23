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
      ...passRule('existing quest progress takes precedence'),
      status: context.progress.status,
      progress: context.progress,
      reasons: ['existing quest progress takes precedence'],
    };
  }

  const reasons: string[] = [];
  const unlockCondition = context.definition.unlockCondition;

  if (unlockCondition?.requiredQuestIds) {
    const missingQuestIds = unlockCondition.requiredQuestIds.filter(
      (questId) => !hasCompletedQuest(questId, context.questProgressEntries),
    );
    if (missingQuestIds.length > 0) {
      reasons.push(`missing completed quests: ${missingQuestIds.join(', ')}`);
    }
  }

  if (unlockCondition?.requiredWorldFlags) {
    const missingFlags = unlockCondition.requiredWorldFlags.filter(
      (flag) => context.worldFlags[flag] !== true,
    );
    if (missingFlags.length > 0) {
      reasons.push(`missing world flags: ${missingFlags.join(', ')}`);
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
    ...passRule('quest is available'),
    status: 'available',
    progress: {
      questId: context.definition.id,
      status: 'available',
      currentObjectiveIndex: 0,
      completedObjectiveIds: [],
      updatedAt: context.now,
    },
    reasons: ['quest is available'],
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
      ...failRule(availability.reason ?? 'quest is not available'),
      progress: fallbackProgress,
      historyEntry: {
        questId: definition.id,
        status: fallbackProgress.status,
        note: availability.reason ?? 'quest activation failed',
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
    ...passRule('quest activated'),
    progress: nextProgress,
    historyEntry: {
      questId: definition.id,
      status: nextProgress.status,
      note: `Quest "${definition.title}" is now active.`,
      updatedAt: now,
    },
    reward: emptyReward(),
    relationChanges: [],
    reasons: ['quest activated'],
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
      ...failRule('quest is not active'),
      progress,
      historyEntry: {
        questId: definition.id,
        status: progress.status,
        note: 'Quest trigger ignored because the quest is not active.',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: ['quest is not active'],
    };
  }

  const objective = definition.objectives[progress.currentObjectiveIndex];

  if (!objective) {
    return {
      ...failRule('quest has no remaining objectives'),
      progress,
      historyEntry: {
        questId: definition.id,
        status: progress.status,
        note: 'Quest trigger ignored because there are no remaining objectives.',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: ['quest has no remaining objectives'],
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
      ...failRule('quest trigger does not match the active objective'),
      progress,
      historyEntry: {
        questId: definition.id,
        status: progress.status,
        note: 'Quest trigger did not match the active objective.',
        updatedAt: now,
      },
      reward: emptyReward(),
      relationChanges: [],
      reasons: ['quest trigger does not match the active objective'],
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
    ...passRule('quest progressed successfully'),
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
    reasons: ['quest progressed successfully'],
  };
};
