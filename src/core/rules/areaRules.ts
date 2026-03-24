import type {
  Area,
  AreaEnterCondition,
  AreaEnvironmentState,
  NpcState,
  QuestProgress,
} from '../schemas';

import { failRule, passRule, type RuleResult } from './ruleResult';

export interface AreaAccessContext {
  currentArea?: Area | null;
  targetArea: Area;
  unlockedAreaIds: string[];
  questProgress: QuestProgress[];
  worldFlags: Record<string, boolean | undefined>;
  npcStatesById?: Record<string, NpcState>;
  ignoreConnectivity?: boolean;
}

export interface AreaAccessResult extends RuleResult {
  areaId: string;
  shouldUnlock: boolean;
  reasons: string[];
}

export interface AreaEnvironmentDebugMutation {
  areaId: string;
  targetStateId: string;
  worldFlagPatch: Record<string, boolean>;
}

const hasCompletedQuest = (
  questId: string,
  questProgress: QuestProgress[],
): boolean =>
  questProgress.some(
    (progress) => progress.questId === questId && progress.status === 'completed',
  );

const getEnterCondition = (area: Area): AreaEnterCondition | undefined =>
  area.enterCondition ?? area.unlockCondition;

const matchesRequiredWorldFlags = (
  requiredWorldFlags: string[] | undefined,
  worldFlags: Record<string, boolean | undefined>,
) =>
  (requiredWorldFlags ?? []).every((flag) => worldFlags[flag] === true);

const matchesBlockedWorldFlags = (
  blockedWorldFlags: string[] | undefined,
  worldFlags: Record<string, boolean | undefined>,
) =>
  (blockedWorldFlags ?? []).every((flag) => worldFlags[flag] !== true);

export const evaluateAreaAccess = (
  context: AreaAccessContext,
): AreaAccessResult => {
  const reasons: string[] = [];
  const { currentArea, targetArea, unlockedAreaIds, questProgress, worldFlags } = context;

  const isConnected =
    context.ignoreConnectivity ||
    !currentArea ||
    currentArea.id === targetArea.id ||
    currentArea.connectedAreaIds.includes(targetArea.id) ||
    targetArea.connectedAreaIds.includes(currentArea.id);

  if (!isConnected) {
    reasons.push('目标区域与当前路线并不连通');
    return {
      ...failRule(reasons[0]),
      areaId: targetArea.id,
      shouldUnlock: false,
      reasons,
    };
  }

  const alreadyUnlocked =
    targetArea.unlockedByDefault || unlockedAreaIds.includes(targetArea.id);

  if (alreadyUnlocked) {
    return {
      ...passRule('区域已经解锁'),
      areaId: targetArea.id,
      shouldUnlock: false,
      reasons: ['区域已经解锁'],
    };
  }

  const unlockCondition = getEnterCondition(targetArea);

  if (!unlockCondition) {
    return {
      ...passRule('该区域没有额外解锁条件'),
      areaId: targetArea.id,
      shouldUnlock: true,
      reasons: ['该区域没有额外解锁条件'],
    };
  }

  const missingQuestIds = (unlockCondition.requiredQuestIds ?? []).filter(
    (questId) => !hasCompletedQuest(questId, questProgress),
  );
  if (missingQuestIds.length > 0) {
    reasons.push(`缺少已完成任务：${missingQuestIds.join('、')}`);
  }

  const missingWorldFlags = (unlockCondition.requiredWorldFlags ?? []).filter(
    (flag) => worldFlags[flag] !== true,
  );
  if (missingWorldFlags.length > 0) {
    reasons.push(`缺少世界标记：${missingWorldFlags.join('、')}`);
  }

  const missingNpcTrust = (unlockCondition.requiredNpcTrust ?? []).filter(
    (requirement) =>
      (context.npcStatesById?.[requirement.npcId]?.trust ?? 0) < requirement.minTrust,
  );
  if (missingNpcTrust.length > 0) {
    reasons.push(
      `缺少角色信任阈值：${missingNpcTrust
        .map((entry) => `${entry.npcId}:${entry.minTrust}`)
        .join('、')}`,
    );
  }

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      areaId: targetArea.id,
      shouldUnlock: false,
      reasons,
    };
  }

  return {
    ...passRule('区域解锁条件已满足'),
    areaId: targetArea.id,
    shouldUnlock: true,
    reasons: ['区域解锁条件已满足'],
  };
};

export const resolveAreaEnvironmentState = (
  area: Area,
  worldFlags: Record<string, boolean | undefined>,
): AreaEnvironmentState => {
  const matchingStates = area.environment.states
    .map((state, index) => ({
      state,
      index,
    }))
    .filter(({ state }) => {
      if (!state.activation) {
        return false;
      }

      return (
        matchesRequiredWorldFlags(state.activation.requiredWorldFlags, worldFlags) &&
        matchesBlockedWorldFlags(state.activation.blockedWorldFlags, worldFlags)
      );
    })
    .sort((left, right) => {
      const leftSpecificity =
        (left.state.activation?.requiredWorldFlags?.length ?? 0) +
        (left.state.activation?.blockedWorldFlags?.length ?? 0);
      const rightSpecificity =
        (right.state.activation?.requiredWorldFlags?.length ?? 0) +
        (right.state.activation?.blockedWorldFlags?.length ?? 0);

      if (leftSpecificity !== rightSpecificity) {
        return rightSpecificity - leftSpecificity;
      }

      return right.index - left.index;
    });

  const matchingState = matchingStates[0]?.state;

  if (matchingState) {
    return matchingState;
  }

  return (
    area.environment.states.find(
      (state) => state.id === area.environment.activeStateId,
    ) ?? area.environment.states[0]
  );
};

export const isAreaVisibleInNavigation = (
  area: Area,
  discoveredAreaIds: string[],
  unlockedAreaIds: string[],
): boolean => {
  const isHiddenArea = area.isHiddenUntilDiscovered ?? area.type === 'hidden';
  if (!isHiddenArea) {
    return true;
  }

  return (
    discoveredAreaIds.includes(area.id) || unlockedAreaIds.includes(area.id)
  );
};

export const buildAreaEnvironmentDebugMutation = (
  area: Area,
  targetStateId: string,
): AreaEnvironmentDebugMutation | null => {
  const targetState = area.environment.states.find((state) => state.id === targetStateId);

  if (!targetState) {
    return null;
  }

  const activationFlags = Array.from(
    new Set(
      area.environment.states.flatMap((state) => [
        ...(state.activation?.requiredWorldFlags ?? []),
        ...(state.activation?.blockedWorldFlags ?? []),
      ]),
    ),
  );

  const worldFlagPatch = Object.fromEntries(
    activationFlags.map((flag) => [flag, false]),
  ) as Record<string, boolean>;

  for (const flag of targetState.activation?.requiredWorldFlags ?? []) {
    worldFlagPatch[flag] = true;
  }

  for (const flag of targetState.activation?.blockedWorldFlags ?? []) {
    worldFlagPatch[flag] = false;
  }

  return {
    areaId: area.id,
    targetStateId,
    worldFlagPatch,
  };
};

export const collectUnlockableAreaIds = (
  areas: Area[],
  context: Omit<AreaAccessContext, 'targetArea'>,
): string[] =>
  areas
    .filter((area) =>
      evaluateAreaAccess({
        ...context,
        targetArea: area,
        ignoreConnectivity: true,
      }).ok,
    )
    .map((area) => area.id);
