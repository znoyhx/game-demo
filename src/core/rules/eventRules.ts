import type {
  EventEffect,
  EventLogEntry,
  NpcState,
  PlayerProfileTag,
  QuestProgress,
  WorldEvent,
} from '../schemas';

import { failRule, passRule, type RuleResult } from './ruleResult';

export interface EventEvaluationContext {
  currentAreaId: string;
  questProgressEntries: QuestProgress[];
  playerTags: PlayerProfileTag[];
  worldFlags: Record<string, boolean | undefined>;
  eventHistory: EventLogEntry[];
  npcStatesById?: Record<string, NpcState>;
}

export interface EventTriggerResult extends RuleResult {
  eventId: string;
  reasons: string[];
}

const hasTriggeredEvent = (
  event: WorldEvent,
  eventHistory: EventLogEntry[],
): boolean =>
  eventHistory.some((entry) => entry.eventId === event.id);

const hasQuestInScope = (
  questId: string,
  questProgressEntries: QuestProgress[],
): boolean =>
  questProgressEntries.some(
    (progress) =>
      progress.questId === questId &&
      (progress.status === 'active' || progress.status === 'completed'),
  );

export const evaluateEventTrigger = (
  event: WorldEvent,
  context: EventEvaluationContext,
): EventTriggerResult => {
  const reasons: string[] = [];

  if (!event.repeatable && hasTriggeredEvent(event, context.eventHistory)) {
    reasons.push('事件已经触发过，且不可重复触发');
  }

  for (const condition of event.triggerConditions) {
    if (
      condition.requiredAreaId &&
      condition.requiredAreaId !== context.currentAreaId
    ) {
      reasons.push(`需要位于区域 ${condition.requiredAreaId}`);
    }

    if (
      condition.requiredQuestId &&
      !hasQuestInScope(condition.requiredQuestId, context.questProgressEntries)
    ) {
      reasons.push(`需要任务 ${condition.requiredQuestId}`);
    }

    if (
      condition.requiredPlayerTag &&
      !context.playerTags.includes(condition.requiredPlayerTag)
    ) {
      reasons.push(`需要玩家标签 ${condition.requiredPlayerTag}`);
    }

    if (
      condition.requiredWorldFlag &&
      context.worldFlags[condition.requiredWorldFlag] !== true
    ) {
      reasons.push(`需要世界标记 ${condition.requiredWorldFlag}`);
    }

    if (
      condition.requiredNpcId &&
      !context.npcStatesById?.[condition.requiredNpcId]
    ) {
      reasons.push(`需要 NPC 状态 ${condition.requiredNpcId}`);
    }
  }

  if (reasons.length > 0) {
    return {
      ...failRule(reasons[0]),
      eventId: event.id,
      reasons,
    };
  }

  return {
    ...passRule('事件触发条件已满足'),
    eventId: event.id,
    reasons: ['事件触发条件已满足'],
  };
};

export const findTriggerableEvents = (
  events: WorldEvent[],
  context: EventEvaluationContext,
): WorldEvent[] =>
  events.filter((event) => evaluateEventTrigger(event, context).ok);

export interface AppliedEventEffect {
  worldFlagsToSet: string[];
  unlockAreaIds: string[];
  startQuestIds: string[];
  npcTrustChanges: Array<{ npcId: string; delta: number }>;
}

export const applyEventEffects = (effects: EventEffect): AppliedEventEffect => ({
  worldFlagsToSet: effects.setWorldFlags ?? [],
  unlockAreaIds: effects.unlockAreaIds ?? [],
  startQuestIds: effects.startQuestIds ?? [],
  npcTrustChanges: effects.updateNpcTrust ?? [],
});
