import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import type { QuestDefinition, QuestProgress, QuestStatus } from '../schemas';
import type { GameStoreState } from '../state';
import {
  applyNpcRelationChange,
  applyQuestTrigger,
  evaluateQuestAvailability,
} from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';

interface QuestProgressionControllerOptions {
  store: StoreApi<GameStoreState>;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  now?: TimestampProvider;
}

export class QuestProgressionController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly now: TimestampProvider;

  constructor(options: QuestProgressionControllerOptions) {
    this.store = options.store;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.now = options.now ?? defaultTimestampProvider;
  }

  private getDefinition(questId: string): QuestDefinition | undefined {
    return this.store.getState().questDefinitionsById[questId];
  }

  private getProgress(questId: string): QuestProgress | undefined {
    return this.store.getState().questProgressById[questId];
  }

  async activateQuest(questId: string) {
    const state = this.store.getState();
    const definition = this.getDefinition(questId);

    if (!definition) {
      return null;
    }

    const availability = evaluateQuestAvailability({
      definition,
      progress: this.getProgress(questId),
      questProgressEntries: state.questProgressOrder.map(
        (id) => state.questProgressById[id],
      ),
      worldFlags: state.worldRuntime.flags,
      now: this.now(),
    });

    if (!availability.ok || !availability.progress) {
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
      note: `Quest "${definition.title}" became active.`,
      updatedAt: nextProgress.updatedAt,
    });

    this.eventBus?.emit('QUEST_UPDATED', {
      questId,
      status: nextProgress.status,
      currentObjectiveIndex: nextProgress.currentObjectiveIndex,
    });

    await maybeAutoSave(this.store, this.saveController, 'auto');

    return nextProgress;
  }

  async applyTrigger(
    trigger: {
      type: QuestDefinition['objectives'][number]['type'];
      targetId?: string;
      count?: number;
      note: string;
    },
    questId?: string,
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
      );

      if (!result.ok) {
        continue;
      }

      state.upsertQuestProgress(result.progress);
      state.appendQuestHistory(result.historyEntry);

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
          Object.fromEntries(
            result.reward.worldFlags.map((flag) => [flag, true]),
          ),
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
            memoryNote: `Quest branch ${result.branchResult?.id ?? 'default'} affected this NPC.`,
          }).state,
        );
      }

      this.eventBus?.emit('QUEST_UPDATED', {
        questId: candidateQuestId,
        status: result.progress.status,
        currentObjectiveIndex: result.progress.currentObjectiveIndex,
      });

      results.push(result);
    }

    if (results.length > 0) {
      await maybeAutoSave(this.store, this.saveController, 'auto');
    }

    return results;
  }

  async forceQuestStatus(questId: string, status: QuestStatus) {
    const state = this.store.getState();
    const definition = this.getDefinition(questId);
    const now = this.now();

    if (!definition) {
      return null;
    }

    const progress: QuestProgress = {
      questId,
      status,
      currentObjectiveIndex:
        status === 'completed' ? definition.objectives.length : 0,
      completedObjectiveIds:
        status === 'completed'
          ? definition.objectives.map((objective) => objective.id)
          : [],
      updatedAt: now,
    };

    state.upsertQuestProgress(progress);
    state.appendQuestHistory({
      questId,
      status,
      note: `Quest status forced to ${status} in debug flow.`,
      updatedAt: now,
    });

    this.eventBus?.emit('QUEST_UPDATED', {
      questId,
      status,
      currentObjectiveIndex: progress.currentObjectiveIndex,
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');

    return progress;
  }
}
