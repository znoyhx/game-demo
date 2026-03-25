import type {
  Area,
  EventDirectorState,
  EventEffect,
  EventLogEntry,
  Faction,
  FactionConflictState,
  NpcDefinition,
  NpcMovementEffect,
  NpcState,
  PlayerProfileTag,
  QuestProgress,
  RevealedClueState,
  ShopPriceModifierState,
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
  worldTimeOfDay?: string;
  worldTension?: number;
}

export interface EventTriggerResult extends RuleResult {
  eventId: string;
  reasons: string[];
}

export interface EventApplicationContext {
  areas: Area[];
  factions: Faction[];
  npcDefinitions: NpcDefinition[];
  eventDirector: EventDirectorState;
  timestamp: string;
}

export interface AppliedEventEffect {
  worldFlagsToSet: string[];
  worldWeather?: string;
  worldTimeOfDay?: string;
  unlockAreaIds: string[];
  lockAreaIds: string[];
  startQuestIds: string[];
  npcTrustChanges: Array<{ npcId: string; delta: number }>;
  areas: Area[];
  factions: Faction[];
  npcDefinitions: NpcDefinition[];
  revealedClues: RevealedClueState[];
  shopPriceModifiers: ShopPriceModifierState[];
  factionConflicts: FactionConflictState[];
  resourceReductions: NonNullable<EventEffect['reduceResources']>;
  npcMovements: NonNullable<EventEffect['moveNpcs']>;
}

const hasTriggeredEvent = (
  event: WorldEvent,
  eventHistory: EventLogEntry[],
): boolean => eventHistory.some((entry) => entry.eventId === event.id);

const findQuestProgress = (
  questId: string,
  questProgressEntries: QuestProgress[],
): QuestProgress | undefined =>
  questProgressEntries.find((progress) => progress.questId === questId);

const mergeUniqueIds = (ids: string[]) => Array.from(new Set(ids));

const updateAreaNpcMembership = (
  area: Area,
  npcId: string,
  action: 'add' | 'remove',
): Area => ({
  ...area,
  npcIds:
    action === 'add'
      ? mergeUniqueIds([...area.npcIds, npcId])
      : area.npcIds.filter((entry) => entry !== npcId),
});

const removeNpcFromArea = (area: Area, npcId: string): Area => ({
  ...updateAreaNpcMembership(area, npcId, 'remove'),
  interactionPoints: area.interactionPoints.filter((point) => point.targetId !== npcId),
  scene: {
    ...area.scene,
    npcSpawns: area.scene.npcSpawns.filter((spawn) => spawn.npcId !== npcId),
  },
});

const defaultNpcPointType = (definition: NpcDefinition) =>
  definition.role === 'merchant' ? 'shop' : 'npc';

const resolveNpcCoordinates = (
  area: Area,
  movement: NpcMovementEffect,
  existingSpawn?: { x: number; y: number },
) => {
  if (movement.x !== undefined && movement.y !== undefined) {
    return {
      x: movement.x,
      y: movement.y,
    };
  }

  if (existingSpawn) {
    return existingSpawn;
  }

  const playerSpawn = area.scene.playerSpawn;

  return {
    x: Math.max(0, Math.min(area.scene.grid.width - 1, playerSpawn.x + 1)),
    y: Math.max(0, Math.min(area.scene.grid.height - 1, playerSpawn.y)),
  };
};

const applyNpcMovement = (
  areas: Area[],
  npcDefinitions: NpcDefinition[],
  movement: NpcMovementEffect,
): {
  areas: Area[];
  npcDefinitions: NpcDefinition[];
} => {
  const definition = npcDefinitions.find((entry) => entry.id === movement.npcId);

  if (!definition) {
    return {
      areas,
      npcDefinitions,
    };
  }

  const sourceArea = areas.find((area) => area.id === definition.areaId);
  const targetArea = areas.find((area) => area.id === movement.toAreaId);

  if (!targetArea) {
    return {
      areas,
      npcDefinitions,
    };
  }

  const sourcePoint = sourceArea?.interactionPoints.find(
    (point) => point.targetId === movement.npcId,
  );
  const sourceSpawn = sourceArea?.scene.npcSpawns.find(
    (spawn) => spawn.npcId === movement.npcId,
  );
  const targetPoint = targetArea.interactionPoints.find(
    (point) => point.targetId === movement.npcId,
  );
  const coordinates = resolveNpcCoordinates(targetArea, movement, sourceSpawn);
  const nextPointId =
    targetPoint?.id ??
    sourcePoint?.id ??
    `interaction:${movement.toAreaId}:${movement.npcId}`;
  const nextPointLabel =
    targetPoint?.label ??
    sourcePoint?.label ??
    (definition.role === 'merchant' ? `与${definition.name}交易` : `与${definition.name}交谈`);
  const nextPointType = targetPoint?.type ?? sourcePoint?.type ?? defaultNpcPointType(definition);

  const nextAreas = areas.map((area) => {
    if (sourceArea && area.id === sourceArea.id && sourceArea.id !== targetArea.id) {
      return removeNpcFromArea(area, movement.npcId);
    }

    if (area.id !== targetArea.id) {
      return area;
    }

    const baseArea =
      sourceArea && sourceArea.id === targetArea.id
        ? removeNpcFromArea(area, movement.npcId)
        : area;
    const nextInteractionPoint = {
      id: nextPointId,
      label: nextPointLabel,
      type: nextPointType,
      x: coordinates.x,
      y: coordinates.y,
      targetId: movement.npcId,
      enabled: true,
    } as const;

    return {
      ...updateAreaNpcMembership(baseArea, movement.npcId, 'add'),
      interactionPoints: [
        ...baseArea.interactionPoints.filter((point) => point.targetId !== movement.npcId),
        nextInteractionPoint,
      ],
      scene: {
        ...baseArea.scene,
        npcSpawns: [
          ...baseArea.scene.npcSpawns.filter((spawn) => spawn.npcId !== movement.npcId),
          {
            npcId: movement.npcId,
            x: coordinates.x,
            y: coordinates.y,
          },
        ],
      },
    };
  });

  return {
    areas: nextAreas,
    npcDefinitions: npcDefinitions.map((entry) =>
      entry.id === movement.npcId
        ? {
            ...entry,
            areaId: movement.toAreaId,
          }
        : entry,
    ),
  };
};

const mergeClues = (
  existing: EventDirectorState['revealedClues'],
  incoming: EventDirectorState['revealedClues'],
) => {
  const byId = new Map(existing.map((clue) => [clue.clueId, clue]));

  incoming.forEach((clue) => {
    byId.set(clue.clueId, clue);
  });

  return Array.from(byId.values());
};

const mergeShopPriceModifiers = (
  existing: EventDirectorState['shopPriceModifiers'],
  incoming: EventDirectorState['shopPriceModifiers'],
) => {
  const byNpcId = new Map(existing.map((modifier) => [modifier.npcId, modifier]));

  incoming.forEach((modifier) => {
    byNpcId.set(modifier.npcId, modifier);
  });

  return Array.from(byNpcId.values());
};

const mergeFactionConflicts = (
  existing: EventDirectorState['factionConflicts'],
  incoming: EventDirectorState['factionConflicts'],
) => {
  const byId = new Map(existing.map((conflict) => [conflict.conflictId, conflict]));

  incoming.forEach((conflict) => {
    byId.set(conflict.conflictId, conflict);
  });

  return Array.from(byId.values());
};

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

    if (condition.requiredQuestId) {
      const questProgress = findQuestProgress(
        condition.requiredQuestId,
        context.questProgressEntries,
      );

      if (!questProgress) {
        reasons.push(`需要任务 ${condition.requiredQuestId}`);
      } else if (
        condition.requiredQuestStatus &&
        questProgress.status !== condition.requiredQuestStatus
      ) {
        reasons.push(`需要任务 ${condition.requiredQuestId} 处于 ${condition.requiredQuestStatus}`);
      } else if (
        !condition.requiredQuestStatus &&
        questProgress.status !== 'active' &&
        questProgress.status !== 'completed'
      ) {
        reasons.push(`需要任务 ${condition.requiredQuestId} 已激活或已完成`);
      }
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

    if (condition.requiredNpcId) {
      const npcState = context.npcStatesById?.[condition.requiredNpcId];

      if (!npcState) {
        reasons.push(`需要角色状态 ${condition.requiredNpcId}`);
      } else {
        if (
          condition.requiredNpcTrustAtLeast !== undefined &&
          npcState.trust < condition.requiredNpcTrustAtLeast
        ) {
          reasons.push(
            `需要角色 ${condition.requiredNpcId} 信任度至少为 ${condition.requiredNpcTrustAtLeast}`,
          );
        }

        if (
          condition.requiredNpcRelationshipAtLeast !== undefined &&
          npcState.relationship < condition.requiredNpcRelationshipAtLeast
        ) {
          reasons.push(
            `需要角色 ${condition.requiredNpcId} 关系值至少为 ${condition.requiredNpcRelationshipAtLeast}`,
          );
        }
      }
    }

    if (
      condition.requiredTimeOfDay &&
      condition.requiredTimeOfDay !== context.worldTimeOfDay
    ) {
      reasons.push(`需要时间段 ${condition.requiredTimeOfDay}`);
    }

    if (
      condition.minimumWorldTension !== undefined &&
      (context.worldTension ?? 0) < condition.minimumWorldTension
    ) {
      reasons.push(`需要世界张力至少为 ${condition.minimumWorldTension}`);
    }

    if (
      condition.maximumWorldTension !== undefined &&
      (context.worldTension ?? 0) > condition.maximumWorldTension
    ) {
      reasons.push(`需要世界张力不高于 ${condition.maximumWorldTension}`);
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
): WorldEvent[] => events.filter((event) => evaluateEventTrigger(event, context).ok);

export const applyEventEffects = (
  eventId: string,
  effects: EventEffect,
  context: EventApplicationContext,
): AppliedEventEffect => {
  let nextAreas = context.areas;
  let nextNpcDefinitions = context.npcDefinitions;

  for (const reduction of effects.reduceResources ?? []) {
    nextAreas = nextAreas.map((area) => {
      if (area.id !== reduction.areaId) {
        return area;
      }

      return {
        ...area,
        resourceNodes: area.resourceNodes.map((resourceNode) => {
          if (
            reduction.resourceNodeId &&
            resourceNode.id !== reduction.resourceNodeId
          ) {
            return resourceNode;
          }

          const minimumRemaining = reduction.minimumRemaining ?? 0;
          const nextQuantity = Math.max(
            minimumRemaining,
            resourceNode.quantity - reduction.amount,
          );

          return {
            ...resourceNode,
            quantity: nextQuantity,
          };
        }),
      };
    });
  }

  for (const movement of effects.moveNpcs ?? []) {
    const movementResult = applyNpcMovement(nextAreas, nextNpcDefinitions, movement);
    nextAreas = movementResult.areas;
    nextNpcDefinitions = movementResult.npcDefinitions;
  }

  for (const appearance of effects.bossAppearances ?? []) {
    const movementResult = applyNpcMovement(nextAreas, nextNpcDefinitions, {
      npcId: appearance.npcId,
      toAreaId: appearance.areaId,
    });
    nextAreas = movementResult.areas;
    nextNpcDefinitions = movementResult.npcDefinitions;
  }

  const nextFactions =
    effects.setFactionStances && effects.setFactionStances.length > 0
      ? context.factions.map((faction) => {
          const change = effects.setFactionStances?.find(
            (entry) => entry.factionId === faction.id,
          );

          return change
            ? {
                ...faction,
                stance: change.stance,
              }
            : faction;
        })
      : context.factions;

  const revealedClues = mergeClues(
    context.eventDirector.revealedClues,
    (effects.revealClues ?? []).map((clue) => ({
      ...clue,
      sourceEventId: eventId,
      revealedAt: context.timestamp,
    })),
  );

  const shopPriceModifiers = mergeShopPriceModifiers(
    context.eventDirector.shopPriceModifiers,
    (effects.setShopPriceModifiers ?? []).map((modifier) => ({
      ...modifier,
      sourceEventId: eventId,
      changedAt: context.timestamp,
    })),
  );

  const factionConflicts = mergeFactionConflicts(
    context.eventDirector.factionConflicts,
    (effects.registerFactionConflicts ?? []).map((conflict) => ({
      ...conflict,
      sourceEventId: eventId,
      startedAt: context.timestamp,
    })),
  );

  return {
    worldFlagsToSet: effects.setWorldFlags ?? [],
    worldWeather: effects.setWeather,
    worldTimeOfDay: effects.setTimeOfDay,
    unlockAreaIds: mergeUniqueIds([
      ...(effects.unlockAreaIds ?? []),
      ...(effects.bossAppearances?.map((appearance) => appearance.areaId) ?? []),
    ]),
    lockAreaIds: effects.lockAreaIds ?? [],
    startQuestIds: effects.startQuestIds ?? [],
    npcTrustChanges: effects.updateNpcTrust ?? [],
    areas: nextAreas,
    factions: nextFactions,
    npcDefinitions: nextNpcDefinitions,
    revealedClues,
    shopPriceModifiers,
    factionConflicts,
    resourceReductions: effects.reduceResources ?? [],
    npcMovements: effects.moveNpcs ?? [],
  };
};
