import type { Area, NpcState, QuestProgress } from '../schemas';

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

const hasCompletedQuest = (
  questId: string,
  questProgress: QuestProgress[],
): boolean =>
  questProgress.some(
    (progress) => progress.questId === questId && progress.status === 'completed',
  );

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
    reasons.push('target area is not connected to the current route');
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
      ...passRule('area is already unlocked'),
      areaId: targetArea.id,
      shouldUnlock: false,
      reasons: ['area is already unlocked'],
    };
  }

  const unlockCondition = targetArea.unlockCondition;

  if (!unlockCondition) {
    return {
      ...passRule('area has no additional unlock conditions'),
      areaId: targetArea.id,
      shouldUnlock: true,
      reasons: ['area has no additional unlock conditions'],
    };
  }

  const missingQuestIds = (unlockCondition.requiredQuestIds ?? []).filter(
    (questId) => !hasCompletedQuest(questId, questProgress),
  );
  if (missingQuestIds.length > 0) {
    reasons.push(`missing completed quests: ${missingQuestIds.join(', ')}`);
  }

  const missingWorldFlags = (unlockCondition.requiredWorldFlags ?? []).filter(
    (flag) => worldFlags[flag] !== true,
  );
  if (missingWorldFlags.length > 0) {
    reasons.push(`missing world flags: ${missingWorldFlags.join(', ')}`);
  }

  const missingNpcTrust = (unlockCondition.requiredNpcTrust ?? []).filter(
    (requirement) =>
      (context.npcStatesById?.[requirement.npcId]?.trust ?? 0) < requirement.minTrust,
  );
  if (missingNpcTrust.length > 0) {
    reasons.push(
      `missing npc trust thresholds: ${missingNpcTrust
        .map((entry) => `${entry.npcId}:${entry.minTrust}`)
        .join(', ')}`,
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
    ...passRule('area unlock conditions satisfied'),
    areaId: targetArea.id,
    shouldUnlock: true,
    reasons: ['area unlock conditions satisfied'],
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
