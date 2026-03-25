import { buildExplorationEncounterTemplate } from '../mocks/mvp/explorationEncounters';
import type {
  Area,
  CombatEncounterDefinition,
  ExplorationEncounterSignal,
  ExplorationRuleState,
  ExplorationState,
  InteractionPoint,
  PlayerState,
  World,
} from '../schemas';

import { applyNpcItemExchange } from './npcRules';
import { failRule, passRule, type RuleResult } from './ruleResult';

const defaultExplorationState: ExplorationState = {
  signals: [],
  ruleStates: [],
  searchedInteractionIds: [],
  collectedResourceNodeIds: [],
};

const clampCoordinate = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildRuleStateKey = (areaId: string, ruleId: string) => `${areaId}:${ruleId}`;

const buildRuleStateMap = (ruleStates: ExplorationRuleState[]) =>
  new Map(ruleStates.map((state) => [buildRuleStateKey(state.areaId, state.ruleId), state]));

const buildWalkableLookup = (area: Area) => {
  const blockedOverlayTiles = new Set(
    area.scene.tiles
      .filter((tile) => tile.layer === 'overlay' && tile.blocked)
      .map((tile) => `${tile.x}:${tile.y}`),
  );
  const walkableGroundTiles = new Set(
    area.scene.tiles
      .filter((tile) => tile.layer === 'ground' && !tile.blocked)
      .map((tile) => `${tile.x}:${tile.y}`),
  );

  return (x: number, y: number) =>
    walkableGroundTiles.has(`${x}:${y}`) && !blockedOverlayTiles.has(`${x}:${y}`);
};

const findSignalAnchor = (
  area: Area,
  interactionPoint: InteractionPoint | null,
  offsetIndex: number,
) => {
  const isWalkable = buildWalkableLookup(area);
  const maxX = area.scene.grid.width - 2;
  const maxY = area.scene.grid.height - 2;
  const baseX = interactionPoint
    ? interactionPoint.x
    : clampCoordinate(area.scene.playerSpawn.x + 2, 1, maxX);
  const baseY = interactionPoint
    ? interactionPoint.y
    : clampCoordinate(area.scene.playerSpawn.y - 2, 1, maxY);
  const offsets = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: 2, y: -1 },
    { x: -2, y: 1 },
    { x: 1, y: -2 },
    { x: -1, y: 2 },
  ];
  const rotatedOffsets = [
    ...offsets.slice(offsetIndex % offsets.length),
    ...offsets.slice(0, offsetIndex % offsets.length),
  ];

  for (const offset of rotatedOffsets) {
    const x = clampCoordinate(baseX + offset.x, 1, maxX);
    const y = clampCoordinate(baseY + offset.y, 1, maxY);

    if (isWalkable(x, y)) {
      return { x, y };
    }
  }

  return {
    x: clampCoordinate(baseX, 1, maxX),
    y: clampCoordinate(baseY, 1, maxY),
  };
};

const isSpawnRuleEligible = (
  area: Area,
  ruleId: string,
  explorationState: ExplorationState,
  maxActive: number,
) => {
  const activeSignals = explorationState.signals.filter(
    (signal) =>
      signal.areaId === area.id &&
      signal.ruleId === ruleId &&
      signal.status === 'pending',
  );
  const ruleState = explorationState.ruleStates.find(
    (state) => state.areaId === area.id && state.ruleId === ruleId,
  );

  return (
    activeSignals.length < maxActive &&
    (ruleState?.triggerCount ?? 0) < maxActive
  );
};

const hasRequiredFlags = (
  worldFlags: World['flags'],
  requiredFlags: string[] | undefined,
  blockedFlags: string[] | undefined,
) =>
  (requiredFlags ?? []).every((flag) => worldFlags[flag] === true) &&
  !(blockedFlags ?? []).some((flag) => worldFlags[flag] === true);

export const buildDefaultExplorationState = (): ExplorationState => ({
  ...defaultExplorationState,
});

export interface ExplorationTriggerResolution extends RuleResult {
  signals: ExplorationEncounterSignal[];
  generatedEncounters: CombatEncounterDefinition[];
  ruleStates: ExplorationRuleState[];
}

export const resolveExplorationTrigger = (options: {
  area: Area;
  trigger: Area['enemySpawnRules'][number]['trigger'];
  worldFlags: World['flags'];
  explorationState?: ExplorationState;
  createdAt: string;
  sourceInteractionId?: string;
}): ExplorationTriggerResolution => {
  const explorationState = options.explorationState ?? buildDefaultExplorationState();
  const ruleStateMap = buildRuleStateMap(explorationState.ruleStates);
  const sourceInteraction =
    options.sourceInteractionId
      ? options.area.interactionPoints.find(
          (point) => point.id === options.sourceInteractionId,
        ) ?? null
      : null;
  const signals: ExplorationEncounterSignal[] = [];
  const generatedEncounters: CombatEncounterDefinition[] = [];
  const nextRuleStates = [...explorationState.ruleStates];

  options.area.enemySpawnRules
    .filter((rule) => rule.trigger === options.trigger)
    .filter((rule) =>
      hasRequiredFlags(
        options.worldFlags,
        rule.requiredWorldFlags,
        rule.blockedWorldFlags,
      ),
    )
    .filter((rule) =>
      isSpawnRuleEligible(
        options.area,
        rule.id,
        explorationState,
        rule.maxActive,
      ),
    )
    .sort((left, right) => right.spawnWeight - left.spawnWeight)
    .forEach((rule, index) => {
      const ruleStateKey = buildRuleStateKey(options.area.id, rule.id);
      const currentRuleState = ruleStateMap.get(ruleStateKey);
      const nextTriggerCount = (currentRuleState?.triggerCount ?? 0) + 1;
      const signalId = `exploration-signal:${options.area.id}:${rule.id}:${nextTriggerCount}`;
      const encounterId =
        rule.encounterId ??
        `encounter:exploration:${options.area.id}:${rule.id}:${nextTriggerCount}`;
      const anchor = findSignalAnchor(options.area, sourceInteraction, index);

      signals.push({
        id: signalId,
        areaId: options.area.id,
        ruleId: rule.id,
        label: rule.label,
        encounterId,
        trigger: rule.trigger,
        status: 'pending',
        createdAt: options.createdAt,
        x: anchor.x,
        y: anchor.y,
        sourceInteractionId: options.sourceInteractionId,
        enemyArchetype: rule.enemyArchetype,
      });

      if (!rule.encounterId) {
        generatedEncounters.push(
          buildExplorationEncounterTemplate({
            encounterId,
            areaId: options.area.id,
            archetype: rule.enemyArchetype ?? 'exploration-hostile',
            fallbackTitle: rule.label,
          }),
        );
      }

      const nextRuleState: ExplorationRuleState = {
        areaId: options.area.id,
        ruleId: rule.id,
        triggerCount: nextTriggerCount,
        lastTriggeredAt: options.createdAt,
      };
      const existingIndex = nextRuleStates.findIndex(
        (state) =>
          state.areaId === nextRuleState.areaId &&
          state.ruleId === nextRuleState.ruleId,
      );

      if (existingIndex >= 0) {
        nextRuleStates[existingIndex] = nextRuleState;
      } else {
        nextRuleStates.push(nextRuleState);
      }
    });

  return {
    ...passRule(
      signals.length > 0 ? `已生成 ${signals.length} 个探索遭遇信号。` : '当前没有新的探索遭遇被触发。',
    ),
    signals,
    generatedEncounters,
    ruleStates: nextRuleStates,
  };
};

export interface SearchInteractionResolution extends RuleResult {
  interactionId: string;
  searchedAlready: boolean;
  searchedInteractionIds: string[];
  collectedResourceNodeIds: string[];
  playerState: PlayerState;
  resourceGain?: {
    resourceNodeId: string;
    itemId?: string;
    quantity: number;
    label: string;
  };
}

export const resolveSearchInteraction = (options: {
  area: Area;
  interactionId: string;
  explorationState?: ExplorationState;
  playerState: PlayerState;
}): SearchInteractionResolution => {
  const explorationState = options.explorationState ?? buildDefaultExplorationState();
  const interactionPoint = options.area.interactionPoints.find(
    (point) => point.id === options.interactionId,
  );

  if (!interactionPoint || interactionPoint.type !== 'item') {
    return {
      ...failRule('当前交互点不是可搜索的物品节点。'),
      interactionId: options.interactionId,
      searchedAlready: false,
      searchedInteractionIds: explorationState.searchedInteractionIds,
      collectedResourceNodeIds: explorationState.collectedResourceNodeIds,
      playerState: options.playerState,
    };
  }

  const searchedAlready = explorationState.searchedInteractionIds.includes(
    interactionPoint.id,
  );
  const searchedInteractionIds = searchedAlready
    ? explorationState.searchedInteractionIds
    : [...explorationState.searchedInteractionIds, interactionPoint.id];

  if (searchedAlready || !interactionPoint.resourceNodeId) {
    return {
      ...passRule(
        searchedAlready ? '该搜索点已经检查过了。' : '已完成搜索，但未发现可收集资源。',
      ),
      interactionId: options.interactionId,
      searchedAlready,
      searchedInteractionIds,
      collectedResourceNodeIds: explorationState.collectedResourceNodeIds,
      playerState: options.playerState,
    };
  }

  const resourceNode = options.area.resourceNodes.find(
    (entry) => entry.id === interactionPoint.resourceNodeId,
  );

  if (!resourceNode) {
    return {
      ...passRule('已完成搜索，但资源节点尚未接入奖励。'),
      interactionId: options.interactionId,
      searchedAlready: false,
      searchedInteractionIds,
      collectedResourceNodeIds: explorationState.collectedResourceNodeIds,
      playerState: options.playerState,
    };
  }

  const alreadyCollected = explorationState.collectedResourceNodeIds.includes(
    resourceNode.id,
  );

  if (alreadyCollected || !resourceNode.itemId) {
    return {
      ...passRule('已完成搜索，但当前节点没有新的可收集物资。'),
      interactionId: options.interactionId,
      searchedAlready: false,
      searchedInteractionIds,
      collectedResourceNodeIds: explorationState.collectedResourceNodeIds,
      playerState: options.playerState,
    };
  }

  const tradeResult = applyNpcItemExchange(
    options.playerState,
    [
      {
        itemId: resourceNode.itemId,
        quantity: resourceNode.quantity,
        direction: 'to-player',
      },
    ],
    0,
  );

  if (!tradeResult.ok) {
    return {
      ...failRule(tradeResult.reason ?? '无法将搜索奖励写入玩家背包。'),
      interactionId: options.interactionId,
      searchedAlready: false,
      searchedInteractionIds: explorationState.searchedInteractionIds,
      collectedResourceNodeIds: explorationState.collectedResourceNodeIds,
      playerState: options.playerState,
    };
  }

  return {
    ...passRule('搜索完成，已将资源加入玩家背包。'),
    interactionId: options.interactionId,
    searchedAlready: false,
    searchedInteractionIds,
    collectedResourceNodeIds: [
      ...explorationState.collectedResourceNodeIds,
      resourceNode.id,
    ],
    playerState: tradeResult.playerState,
    resourceGain: {
      resourceNodeId: resourceNode.id,
      itemId: resourceNode.itemId,
      quantity: resourceNode.quantity,
      label: resourceNode.label,
    },
  };
};
