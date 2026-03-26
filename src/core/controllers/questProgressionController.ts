import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import type {
  NpcState,
  QuestDefinition,
  QuestProgress,
  QuestStatus,
} from '../schemas';
import type { GameStoreState } from '../state';
import { locale } from '../utils/locale';
import {
  applyNpcRelationChange,
  applyQuestTrigger,
  evaluateQuestAvailability,
  evaluateQuestBranchSelection,
  evaluateQuestFailure,
} from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import type { PlayerModelController } from './playerModelController';
import type { ReviewGenerationController } from './reviewGenerationController';

interface QuestProgressionControllerOptions {
  store: StoreApi<GameStoreState>;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  playerModelController?: PlayerModelController;
  reviewController?: ReviewGenerationController;
  now?: TimestampProvider;
}

export class QuestProgressionController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly playerModelController?: PlayerModelController;

  private readonly reviewController?: ReviewGenerationController;

  private readonly now: TimestampProvider;

  constructor(options: QuestProgressionControllerOptions) {
    this.store = options.store;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.playerModelController = options.playerModelController;
    this.reviewController = options.reviewController;
    this.now = options.now ?? defaultTimestampProvider;
  }

  private getDefinition(questId: string): QuestDefinition | undefined {
    return this.store.getState().questDefinitionsById[questId];
  }

  private getProgress(questId: string): QuestProgress | undefined {
    return this.store.getState().questProgressById[questId];
  }

  private buildRuleContext(state: GameStoreState = this.store.getState()) {
    return {
      questProgressEntries: state.questProgressOrder.map(
        (id) => state.questProgressById[id],
      ),
      worldFlags: state.worldRuntime.flags,
      currentAreaId: state.mapState.currentAreaId,
      visitedAreaIds: state.mapState.visitHistory,
      playerTags: state.playerModel.tags,
      eventHistory: state.eventHistory,
      npcStatesById: state.npcStatesById as Record<string, NpcState>,
    };
  }

  private emitQuestUpdated(progress: QuestProgress) {
    this.eventBus?.emit('QUEST_UPDATED', {
      questId: progress.questId,
      status: progress.status,
      currentObjectiveIndex: progress.currentObjectiveIndex,
    });
  }

  private applyTransitionEffects(result: {
    reward: {
      gold: number;
      items: string[];
      unlockAreaIds: string[];
      worldFlags: string[];
    };
    relationChanges: Array<{ npcId: string; delta: number }>;
    branchResult?: {
      id: string;
    };
  }) {
    const state = this.store.getState();

    if (result.reward.gold || result.reward.items.length > 0) {
      state.setPlayerState({
        ...state.player,
        gold: state.player.gold + result.reward.gold,
        inventory: [...state.player.inventory].concat(
          result.reward.items.map((itemId) => ({
            itemId,
            quantity: 1,
          })),
        ),
      });
    }

    if (result.reward.worldFlags.length > 0) {
      state.setWorldFlags(
        Object.fromEntries(result.reward.worldFlags.map((flag) => [flag, true])),
      );
    }

    if (result.reward.unlockAreaIds.length > 0) {
      state.setUnlockedAreaIds([
        ...state.mapState.unlockedAreaIds,
        ...result.reward.unlockAreaIds,
      ]);
    }

    for (const relationChange of result.relationChanges) {
      const npcState = state.npcStatesById[relationChange.npcId];
      if (!npcState) {
        continue;
      }

      state.upsertNpcState(
        applyNpcRelationChange(npcState, {
          relationshipDelta: relationChange.delta,
          timestamp: this.now(),
          memoryNote: locale.controllers.questProgression.branchMemoryNote(
            result.branchResult?.id ?? 'default',
          ),
        }).state,
      );
    }
  }

  private async maybeGenerateRunOutcomeReview(
    definition: QuestDefinition | undefined,
    progress: QuestProgress | undefined,
    summary: string,
    reasons: string[],
  ) {
    if (!this.reviewController || !definition || !progress || definition.type !== 'main') {
      return;
    }

    if (progress.status !== 'completed' && progress.status !== 'failed') {
      return;
    }

    await this.reviewController.generateReview({
      request: {
        trigger: progress.status === 'completed' ? 'run-complete' : 'run-failed',
        runOutcome: {
          result: progress.status === 'completed' ? 'completed' : 'failed',
          questId: definition.id,
          questTitle: definition.title,
          summary,
          reasons,
        },
      },
      autoOpenPanel: true,
      autoSave: false,
    });
  }

  async activateQuest(
    questId: string,
    options?: {
      autoSave?: boolean;
      saveSource?: 'auto' | 'manual' | 'debug';
    },
  ) {
    const state = this.store.getState();
    const definition = this.getDefinition(questId);

    if (!definition) {
      return null;
    }

    const availability = evaluateQuestAvailability({
      definition,
      progress: this.getProgress(questId),
      ...this.buildRuleContext(state),
      now: this.now(),
    });

    if (!availability.ok || !availability.progress) {
      return availability;
    }

    if (availability.progress.status === 'active') {
      return availability.progress;
    }

    if (availability.progress.status !== 'available') {
      return availability;
    }

    const nextProgress: QuestProgress = {
      ...availability.progress,
      status: 'active',
      updatedAt: this.now(),
    };

    state.upsertQuestProgress(nextProgress);
    state.appendQuestHistory({
      questId,
      status: nextProgress.status,
      note: locale.controllers.questProgression.activationNote(definition.title),
      updatedAt: nextProgress.updatedAt,
    });

    this.emitQuestUpdated(nextProgress);

    if (options?.autoSave !== false) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        options?.saveSource ?? 'auto',
        'quest-update',
      );
    }

    return nextProgress;
  }

  async refreshQuestStatuses(options?: {
    autoSave?: boolean;
    saveSource?: 'auto' | 'manual' | 'debug';
  }) {
    const state = this.store.getState();
    const updatedProgressEntries: QuestProgress[] = [];
    const now = this.now();

    for (const questId of state.questDefinitionOrder) {
      const definition = this.getDefinition(questId);
      const progress = this.getProgress(questId);

      if (!definition) {
        continue;
      }

      if (progress?.status === 'active') {
        const failureResult = evaluateQuestFailure(
          definition,
          progress,
          this.buildRuleContext(),
          now,
        );

        if (failureResult) {
          state.upsertQuestProgress(failureResult.progress);
          state.appendQuestHistory(failureResult.historyEntry);
          this.emitQuestUpdated(failureResult.progress);
          updatedProgressEntries.push(failureResult.progress);
          await this.maybeGenerateRunOutcomeReview(
            definition,
            failureResult.progress,
            failureResult.historyEntry.note,
            failureResult.reasons,
          );
        }

        continue;
      }

      const availability = evaluateQuestAvailability({
        definition,
        progress,
        ...this.buildRuleContext(),
        now,
      });

      if (!availability.progress) {
        continue;
      }

      const nextStatus =
        definition.type === 'dynamic' && availability.status === 'available'
          ? 'active'
          : availability.status;
      const nextProgress: QuestProgress = {
        ...availability.progress,
        status: nextStatus,
        updatedAt: now,
      };
      const shouldSkipNewLockedEntry = !progress && nextStatus === 'locked';
      const hasStatusChanged = progress?.status !== nextProgress.status;

      if (shouldSkipNewLockedEntry || !hasStatusChanged) {
        continue;
      }

      state.upsertQuestProgress(nextProgress);
      state.appendQuestHistory({
        questId,
        status: nextProgress.status,
        note:
          definition.type === 'dynamic' && nextProgress.status === 'active'
            ? locale.controllers.questProgression.dynamicActivationNote(
                definition.title,
              )
            : locale.controllers.questProgression.statusSyncNote(
                definition.title,
                locale.labels.questStatuses[nextProgress.status],
              ),
        updatedAt: now,
      });
      this.emitQuestUpdated(nextProgress);
      updatedProgressEntries.push(nextProgress);
    }

    if (updatedProgressEntries.length > 0 && options?.autoSave !== false) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        options?.saveSource ?? 'auto',
        'quest-update',
      );
    }

    return updatedProgressEntries;
  }

  async chooseBranch(
    questId: string,
    branchId: string,
    options?: {
      saveSource?: 'auto' | 'manual' | 'debug';
    },
  ) {
    const state = this.store.getState();
    const definition = this.getDefinition(questId);
    const progress = this.getProgress(questId);

    if (!definition || !progress) {
      return null;
    }

    const branchSelection = evaluateQuestBranchSelection(
      definition,
      branchId,
      this.buildRuleContext(state),
    );

    if (!branchSelection.ok) {
      return branchSelection;
    }

    const nextProgress: QuestProgress = {
      ...progress,
      chosenBranchId: branchId,
      updatedAt: this.now(),
    };

    state.upsertQuestProgress(nextProgress);
    state.appendQuestHistory({
      questId,
      status: nextProgress.status,
      note: locale.controllers.questProgression.branchSelectedNote(
        branchSelection.branchResult?.label ?? branchId,
      ),
      branchId,
      updatedAt: nextProgress.updatedAt,
    });
    this.emitQuestUpdated(nextProgress);
    await this.playerModelController?.recordQuestChoice(branchId, {
      autoSave: false,
    });
    await this.reviewController?.generateReview({
      request: {
        trigger: 'quest-branch',
        questBranch: {
          questId,
          questTitle: definition.title,
          branchId,
          branchLabel: branchSelection.branchResult?.label,
          status: nextProgress.status,
          summary: branchSelection.branchResult
            ? `任务“${definition.title}”已切换到“${branchSelection.branchResult.label}”分支。`
            : `任务“${definition.title}”已切换分支。`,
          reasons:
            branchSelection.branchResult &&
            branchSelection.branchResult.activationConditions.length > 0
              ? branchSelection.branchResult.activationConditions.map(
                  (condition) => `满足条件：${condition.label}`,
                )
              : branchSelection.reasons,
        },
      },
      autoOpenPanel: false,
      autoSave: false,
    });

    await maybeAutoSave(
      this.store,
      this.saveController,
      options?.saveSource ?? 'auto',
      'quest-update',
    );

    return nextProgress;
  }

  async applyTrigger(
    trigger: {
      type: NonNullable<QuestDefinition['objectives']>[number]['type'];
      targetId?: string;
      count?: number;
      note: string;
    },
    questId?: string,
    options?: {
      saveSource?: 'auto' | 'manual' | 'debug';
      autoSave?: boolean;
    },
  ) {
    const state = this.store.getState();
    const candidateQuestIds = questId
      ? [questId]
      : state.questProgressOrder.filter(
          (id) => state.questProgressById[id]?.status === 'active',
        );
    const results = [];

    for (const candidateQuestId of candidateQuestIds) {
      const definition = this.getDefinition(candidateQuestId);
      const progress = this.getProgress(candidateQuestId);

      if (!definition || !progress) {
        continue;
      }

      const result = applyQuestTrigger(
        definition,
        progress,
        trigger,
        this.now(),
        progress.chosenBranchId,
        this.buildRuleContext(this.store.getState()),
      );

      if (!result.ok) {
        continue;
      }

      state.upsertQuestProgress(result.progress);
      state.appendQuestHistory(result.historyEntry);
      this.applyTransitionEffects(result);
      this.emitQuestUpdated(result.progress);
      await this.maybeGenerateRunOutcomeReview(
        definition,
        result.progress,
        result.historyEntry.note,
        result.reasons,
      );

      results.push(result);
    }

    if (results.length > 0) {
      await this.refreshQuestStatuses({
        autoSave: false,
      });
      if (options?.autoSave !== false) {
        await maybeAutoSave(
          this.store,
          this.saveController,
          options?.saveSource ?? 'auto',
          'quest-update',
        );
      }
    }

    return results;
  }

  async forceQuestStatus(
    questId: string,
    status: QuestStatus,
    options?: {
      saveSource?: 'auto' | 'manual' | 'debug';
    },
  ) {
    const state = this.store.getState();
    const definition = this.getDefinition(questId);
    const now = this.now();

    if (!definition) {
      return null;
    }

    const completionConditionCount =
      definition.completionConditions.length || definition.objectives?.length || 0;
    const progress: QuestProgress = {
      questId,
      status,
      currentObjectiveIndex: status === 'completed' ? completionConditionCount : 0,
      completedObjectiveIds:
        status === 'completed'
          ? (
              definition.completionConditions.length > 0
                ? definition.completionConditions
                : (definition.objectives ?? [])
            ).map((condition) => condition.id)
          : [],
      updatedAt: now,
    };

    state.upsertQuestProgress(progress);
    state.appendQuestHistory({
      questId,
      status,
      note: locale.controllers.questProgression.forceStatusNote(
        locale.labels.questStatuses[status],
      ),
      updatedAt: now,
    });

    this.emitQuestUpdated(progress);
    await this.maybeGenerateRunOutcomeReview(
      definition,
      progress,
      locale.controllers.questProgression.forceStatusNote(
        locale.labels.questStatuses[status],
      ),
      [`调试流程将任务“${definition.title}”直接设置为${locale.labels.questStatuses[status]}。`],
    );

    await maybeAutoSave(
      this.store,
      this.saveController,
      options?.saveSource ?? 'debug',
      'quest-update',
    );

    return progress;
  }
}
