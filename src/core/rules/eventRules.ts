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
    reasons.push('event already triggered and is not repeatable');
  }

  for (const condition of event.triggerConditions) {
    if (
      condition.requiredAreaId &&
      condition.requiredAreaId !== context.currentAreaId
    ) {
      reasons.push(`requires area ${condition.requiredAreaId}`);
    }

    if (
      condition.requiredQuestId &&
      !hasQuestInScope(condition.requiredQuestId, context.questProgressEntries)
    ) {
      reasons.push(`requires quest ${condition.requiredQuestId}`);
    }

    if (
      condition.requiredPlayerTag &&
      !context.playerTags.includes(condition.requiredPlayerTag)
    ) {
      reasons.push(`requires player tag ${condition.requiredPlayerTag}`);
    }

    if (
      condition.requiredWorldFlag &&
      context.worldFlags[condition.requiredWorldFlag] !== true
    ) {
      reasons.push(`requires world flag ${condition.requiredWorldFlag}`);
    }

    if (
      condition.requiredNpcId &&
      !context.npcStatesById?.[condition.requiredNpcId]
    ) {
      reasons.push(`requires npc state ${condition.requiredNpcId}`);
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
    ...passRule('event trigger conditions satisfied'),
    eventId: event.id,
    reasons: ['event trigger conditions satisfied'],
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
