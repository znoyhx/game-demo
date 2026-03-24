import type { StoreApi } from 'zustand/vanilla';

import type {
  DebugToolsState,
  QuestCondition,
  QuestConditionType,
  QuestDefinition,
  QuestObjectiveType,
  QuestProgress,
  QuestStatus,
  SaveSnapshot,
  SessionSnapshot,
  QuestDebugConditionCategory,
  QuestDebugConditionSimulationRequest,
  QuestDebugConditionSummary,
  QuestDebugDependencyGraphNode,
  QuestDebugSnapshot,
  QuestDebugStageInjectionRequest,
} from '../schemas';
import {
  questDebugConditionSimulationSchema,
  questDebugSnapshotSchema,
  questDebugStageInjectionSchema,
} from '../schemas';
import type { GameStoreState } from '../state';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { QuestProgressionController } from './questProgressionController';

interface QuestDebugControllerOptions {
  store: StoreApi<GameStoreState>;
  questController: QuestProgressionController;
  saveController?: SaveWriter;
  now?: TimestampProvider;
}

interface QuestDebugBaseline {
  saveSnapshot: SaveSnapshot;
  sessionSnapshot: SessionSnapshot;
}

interface ResolvedQuestCondition {
  condition: QuestCondition;
  category: QuestDebugConditionCategory;
  index: number;
}

const uniqueIds = <T extends string>(values: T[]) => Array.from(new Set(values));

const directTriggerConditionTypes = new Set<QuestObjectiveType>([
  'talk',
  'visit',
  'collect',
  'battle',
  'trigger',
]);

const buildLegacyTriggerCondition = (
  definition: QuestDefinition,
  worldFlag: string,
): QuestCondition => ({
  id: `legacy:trigger:${definition.id}:${worldFlag}`,
  label: `世界标记 ${worldFlag}`,
  type: 'world-flag',
  targetId: worldFlag,
});

const buildLegacyCompletionCondition = (
  objective: NonNullable<QuestDefinition['objectives']>[number],
): QuestCondition => ({
  id: objective.id,
  label: objective.label,
  type: objective.type,
  targetId: objective.targetId,
  requiredCount: objective.requiredCount,
});

const getTriggerConditions = (definition: QuestDefinition): QuestCondition[] => [
  ...(definition.triggerConditions ?? []),
  ...((definition.unlockCondition?.requiredWorldFlags ?? []).map((worldFlag) =>
    buildLegacyTriggerCondition(definition, worldFlag),
  )),
];

const getCompletionConditions = (definition: QuestDefinition): QuestCondition[] => {
  if ((definition.completionConditions ?? []).length > 0) {
    return definition.completionConditions;
  }

  return (definition.objectives ?? []).map(buildLegacyCompletionCondition);
};

const getFailureConditions = (definition: QuestDefinition): QuestCondition[] =>
  definition.failureConditions ?? [];

const getQuestStatusDependencyIds = (conditions: QuestCondition[]): string[] =>
  conditions
    .filter(
      (condition) =>
        condition.type === 'quest-status' && Boolean(condition.targetId),
    )
    .map((condition) => condition.targetId!);

const getDependencyQuestIds = (definition: QuestDefinition): string[] =>
  uniqueIds([
    ...(definition.dependencies ?? []).map((dependency) => dependency.questId),
    ...(definition.unlockCondition?.requiredQuestIds ?? []),
    ...getQuestStatusDependencyIds(getTriggerConditions(definition)),
    ...getQuestStatusDependencyIds(getCompletionConditions(definition)),
    ...getQuestStatusDependencyIds(getFailureConditions(definition)),
  ]);

const buildLockedProgress = (
  definition: QuestDefinition,
  now: string,
): QuestProgress => ({
  questId: definition.id,
  status: 'locked',
  currentObjectiveIndex: 0,
  completedObjectiveIds: [],
  updatedAt: now,
});

export class QuestDebugController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly questController: QuestProgressionController;

  private readonly saveController?: SaveWriter;

  private readonly now: TimestampProvider;

  private readonly baselines = new Map<string, QuestDebugBaseline>();

  constructor(options: QuestDebugControllerOptions) {
    this.store = options.store;
    this.questController = options.questController;
    this.saveController = options.saveController;
    this.now = options.now ?? defaultTimestampProvider;
  }

  private enableDebugState(patch?: Partial<DebugToolsState>) {
    this.store.getState().patchDebugToolsState({
      debugModeEnabled: true,
      logsPanelOpen: true,
      ...patch,
    });
  }

  private getDefinition(questId: string): QuestDefinition | undefined {
    return this.store.getState().questDefinitionsById[questId];
  }

  private getProgress(questId: string): QuestProgress | undefined {
    return this.store.getState().questProgressById[questId];
  }

  private captureBaseline(questId: string) {
    if (this.baselines.has(questId)) {
      return;
    }

    const state = this.store.getState();
    this.baselines.set(questId, {
      saveSnapshot: state.exportSaveSnapshot(),
      sessionSnapshot: state.exportSessionSnapshot(),
    });
  }

  private updateQuestProgress(
    questId: string,
    nextProgress: QuestProgress,
    note: string,
    branchId?: string,
  ) {
    const state = this.store.getState();
    state.upsertQuestProgress(nextProgress);
    state.appendQuestHistory({
      questId,
      status: nextProgress.status,
      note,
      branchId,
      updatedAt: nextProgress.updatedAt,
    });
  }

  private resolveCondition(
    definition: QuestDefinition,
    conditionId: string,
  ): ResolvedQuestCondition | null {
    const groups: Array<{
      category: QuestDebugConditionCategory;
      conditions: QuestCondition[];
    }> = [
      { category: 'trigger', conditions: getTriggerConditions(definition) },
      { category: 'completion', conditions: getCompletionConditions(definition) },
      { category: 'failure', conditions: getFailureConditions(definition) },
    ];

    for (const group of groups) {
      const index = group.conditions.findIndex(
        (condition) => condition.id === conditionId,
      );

      if (index >= 0) {
        return {
          condition: group.conditions[index],
          category: group.category,
          index,
        };
      }
    }

    return null;
  }

  private isConditionSatisfied(
    condition: QuestCondition,
    progress: QuestProgress,
    category: QuestDebugConditionCategory,
    currentIndex: number,
  ) {
    const state = this.store.getState();

    if (progress.completedObjectiveIds.includes(condition.id)) {
      return true;
    }

    if (category === 'completion' && currentIndex === progress.currentObjectiveIndex) {
      return false;
    }

    switch (condition.type as QuestConditionType) {
      case 'quest-status':
        return (
          Boolean(condition.targetId) &&
          state.questProgressById[condition.targetId!]?.status ===
            (condition.requiredStatus ?? 'completed')
        );
      case 'world-flag':
        return (
          Boolean(condition.targetId) &&
          state.worldRuntime.flags[condition.targetId!] === true
        );
      case 'npc-trust':
        return (
          Boolean(condition.targetId) &&
          (state.npcStatesById[condition.targetId!]?.trust ?? 0) >=
            (condition.minTrust ?? 0)
        );
      case 'player-tag':
        return condition.playerTag
          ? state.playerModel.tags.includes(condition.playerTag)
          : false;
      case 'event':
        return condition.targetId
          ? state.eventHistory.some((entry) => entry.eventId === condition.targetId)
          : false;
      case 'current-area':
        return condition.targetId
          ? state.mapState.currentAreaId === condition.targetId
          : false;
      case 'visited-area':
        return condition.targetId
          ? state.mapState.visitHistory.includes(condition.targetId)
          : false;
      default:
        return false;
    }
  }

  private buildConditionSummary(
    condition: QuestCondition,
    category: QuestDebugConditionCategory,
    progress: QuestProgress,
    currentIndex: number,
  ): QuestDebugConditionSummary {
    return {
      id: condition.id,
      label: condition.label,
      type: condition.type,
      category,
      targetId: condition.targetId,
      requiredStatus: condition.requiredStatus,
      requiredCount: condition.requiredCount,
      minTrust: condition.minTrust,
      playerTag: condition.playerTag,
      satisfied: this.isConditionSatisfied(condition, progress, category, currentIndex),
      current:
        category === 'completion' &&
        progress.status === 'active' &&
        currentIndex === progress.currentObjectiveIndex,
    };
  }

  private buildSnapshot(): QuestDebugSnapshot {
    const state = this.store.getState();
    const definitions = state.questDefinitionOrder.map(
      (questId) => state.questDefinitionsById[questId],
    );
    const dependencyMap = new Map<string, string[]>();
    const reverseDependencyMap = new Map<string, string[]>();

    for (const definition of definitions) {
      const dependencies = getDependencyQuestIds(definition);
      dependencyMap.set(definition.id, dependencies);

      for (const dependencyId of dependencies) {
        const dependents = reverseDependencyMap.get(dependencyId) ?? [];
        reverseDependencyMap.set(
          dependencyId,
          uniqueIds([...dependents, definition.id]),
        );
      }
    }

    const quests = definitions.map((definition) => {
      const progress =
        this.getProgress(definition.id) ?? buildLockedProgress(definition, this.now());
      const triggerConditions = getTriggerConditions(definition);
      const completionConditions = getCompletionConditions(definition);
      const failureConditions = getFailureConditions(definition);
      const questLogs = state.questHistory.filter(
        (entry) => entry.questId === definition.id,
      );

      return {
        questId: definition.id,
        title: definition.title,
        type: definition.type,
        status: progress.status,
        currentObjectiveIndex: progress.currentObjectiveIndex,
        currentConditionId:
          completionConditions[progress.currentObjectiveIndex]?.id,
        completedObjectiveIds: progress.completedObjectiveIds,
        chosenBranchId: progress.chosenBranchId,
        canReset: this.baselines.has(definition.id),
        dependencyQuestIds: dependencyMap.get(definition.id) ?? [],
        dependentQuestIds: reverseDependencyMap.get(definition.id) ?? [],
        triggerConditions: triggerConditions.map((condition, index) =>
          this.buildConditionSummary(condition, 'trigger', progress, index),
        ),
        completionConditions: completionConditions.map((condition, index) =>
          this.buildConditionSummary(condition, 'completion', progress, index),
        ),
        failureConditions: failureConditions.map((condition, index) =>
          this.buildConditionSummary(condition, 'failure', progress, index),
        ),
        branches: (definition.branchResults ?? []).map((branch) => ({
          id: branch.id,
          label: branch.label,
          description: branch.description,
          selected: progress.chosenBranchId === branch.id,
        })),
        logCount: questLogs.length,
      };
    });

    const dependencyGraph: QuestDebugDependencyGraphNode[] = definitions.map(
      (definition) => {
        const progress =
          this.getProgress(definition.id) ?? buildLockedProgress(definition, this.now());

        return {
          questId: definition.id,
          title: definition.title,
          type: definition.type,
          status: progress.status,
          dependsOn: dependencyMap.get(definition.id) ?? [],
          requiredBy: reverseDependencyMap.get(definition.id) ?? [],
        };
      },
    );

    return questDebugSnapshotSchema.parse({
      quests,
      dependencyGraph,
      logs: state.questHistory,
    });
  }

  getDebugSnapshot() {
    return this.buildSnapshot();
  }

  async activateQuest(questId: string) {
    const definition = this.getDefinition(questId);

    if (!definition) {
      return null;
    }

    this.captureBaseline(questId);
    this.enableDebugState({
      forcedQuestId: questId,
    });

    return this.questController.forceQuestStatus(questId, 'active', {
      saveSource: 'debug',
    });
  }

  async setQuestStatus(questId: string, status: QuestStatus) {
    const definition = this.getDefinition(questId);

    if (!definition) {
      return null;
    }

    this.captureBaseline(questId);
    this.enableDebugState({
      forcedQuestId: questId,
    });

    return this.questController.forceQuestStatus(questId, status, {
      saveSource: 'debug',
    });
  }

  async chooseBranch(questId: string, branchId: string) {
    const definition = this.getDefinition(questId);

    if (!definition) {
      return null;
    }

    this.captureBaseline(questId);
    this.enableDebugState({
      forcedQuestId: questId,
    });

    const progress = this.getProgress(questId);

    if (!progress || progress.status === 'locked' || progress.status === 'available') {
      await this.questController.forceQuestStatus(questId, 'active', {
        saveSource: 'debug',
      });
    }

    return this.questController.chooseBranch(questId, branchId, {
      saveSource: 'debug',
    });
  }

  async jumpToStage(request: QuestDebugStageInjectionRequest) {
    const parsedRequest = questDebugStageInjectionSchema.parse(request);
    const definition = this.getDefinition(parsedRequest.questId);

    if (!definition) {
      return null;
    }

    this.captureBaseline(parsedRequest.questId);
    this.enableDebugState({
      forcedQuestId: parsedRequest.questId,
    });

    const completionConditions = getCompletionConditions(definition);
    const stageIndex = Math.min(
      parsedRequest.stageIndex,
      completionConditions.length,
    );
    const nextStatus: QuestStatus =
      stageIndex >= completionConditions.length ? 'completed' : 'active';
    const nextProgress: QuestProgress = {
      questId: parsedRequest.questId,
      status: nextStatus,
      currentObjectiveIndex: stageIndex,
      completedObjectiveIds: completionConditions
        .slice(0, stageIndex)
        .map((condition) => condition.id),
      chosenBranchId: parsedRequest.chosenBranchId,
      updatedAt: this.now(),
    };

    this.updateQuestProgress(
      parsedRequest.questId,
      nextProgress,
      `调试跳转到第 ${Math.max(stageIndex, 1)} 阶验证节点。`,
      parsedRequest.chosenBranchId,
    );

    await maybeAutoSave(this.store, this.saveController, 'debug');

    return nextProgress;
  }

  private async satisfyStateCondition(condition: QuestCondition) {
    const state = this.store.getState();

    switch (condition.type as QuestConditionType) {
      case 'quest-status':
        if (condition.targetId) {
          await this.questController.forceQuestStatus(
            condition.targetId,
            condition.requiredStatus ?? 'completed',
            {
              saveSource: 'debug',
            },
          );
        }
        break;
      case 'world-flag':
        if (condition.targetId) {
          state.setWorldFlag(condition.targetId, true);
        }
        break;
      case 'npc-trust':
        if (condition.targetId) {
          const npcState = state.npcStatesById[condition.targetId];
          if (npcState) {
            state.upsertNpcState({
              ...npcState,
              trust: Math.max(
                npcState.trust,
                condition.minTrust ?? npcState.trust,
              ),
            });
          }
        }
        break;
      case 'player-tag':
        if (condition.playerTag) {
          state.setPlayerModelTags(
            uniqueIds([...state.playerModel.tags, condition.playerTag]),
          );
        }
        break;
      case 'event':
        if (condition.targetId) {
          state.appendEventHistory({
            eventId: condition.targetId,
            triggeredAt: this.now(),
            source: 'debug',
          });
        }
        break;
      case 'current-area':
        if (condition.targetId) {
          state.setCurrentAreaId(condition.targetId);
        }
        break;
      case 'visited-area':
        if (condition.targetId) {
          state.setDiscoveredAreaIds(
            uniqueIds([...state.mapState.discoveredAreaIds, condition.targetId]),
          );
          state.setUnlockedAreaIds(
            uniqueIds([...state.mapState.unlockedAreaIds, condition.targetId]),
          );
          state.appendAreaVisit(condition.targetId);
        }
        break;
      default:
        break;
    }
  }

  async simulateCondition(request: QuestDebugConditionSimulationRequest) {
    const parsedRequest = questDebugConditionSimulationSchema.parse(request);
    const definition = this.getDefinition(parsedRequest.questId);

    if (!definition) {
      return null;
    }

    const resolvedCondition = this.resolveCondition(
      definition,
      parsedRequest.conditionId,
    );

    if (!resolvedCondition) {
      return null;
    }

    this.captureBaseline(parsedRequest.questId);
    this.enableDebugState({
      forcedQuestId: parsedRequest.questId,
    });

    const currentProgress =
      this.getProgress(parsedRequest.questId) ??
      buildLockedProgress(definition, this.now());

    if (resolvedCondition.category === 'completion') {
      if (
        currentProgress.status !== 'active' ||
        currentProgress.currentObjectiveIndex !== resolvedCondition.index
      ) {
        await this.jumpToStage({
          questId: parsedRequest.questId,
          stageIndex: resolvedCondition.index,
          chosenBranchId: currentProgress.chosenBranchId,
        });
      }

      await this.satisfyStateCondition(resolvedCondition.condition);

      return this.questController.applyTrigger(
        {
          type: directTriggerConditionTypes.has(
            resolvedCondition.condition.type as QuestObjectiveType,
          )
            ? (resolvedCondition.condition.type as QuestObjectiveType)
            : 'trigger',
          targetId: resolvedCondition.condition.targetId,
          count:
            parsedRequest.count ??
            resolvedCondition.condition.requiredCount ??
            1,
          note:
            parsedRequest.note ??
            `调试模拟条件：${resolvedCondition.condition.label}`,
        },
        parsedRequest.questId,
        {
          saveSource: 'debug',
        },
      );
    }

    await this.satisfyStateCondition(resolvedCondition.condition);
    await this.questController.refreshQuestStatuses({
      autoSave: false,
      saveSource: 'debug',
    });
    await maybeAutoSave(this.store, this.saveController, 'debug');

    return this.buildSnapshot();
  }

  async resetQuest(questId: string) {
    const baseline = this.baselines.get(questId);

    if (!baseline) {
      return null;
    }

    const state = this.store.getState();
    state.hydrateFromSnapshot(baseline.saveSnapshot);
    state.hydrateFromSessionSnapshot({
      ...baseline.sessionSnapshot,
      debug: {
        ...baseline.sessionSnapshot.debug,
        debugModeEnabled: true,
        logsPanelOpen: true,
        forcedQuestId: questId,
      },
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');

    return this.getDebugSnapshot();
  }
}
