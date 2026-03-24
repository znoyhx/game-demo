import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type { EventLogSource } from '../schemas';
import type { GameStoreState } from '../state';
import { applyNpcRelationChange, applyEventEffects, evaluateEventTrigger } from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { QuestProgressionController } from './questProgressionController';

interface EventTriggerControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  questController?: QuestProgressionController;
  logger?: GameLogger;
  now?: TimestampProvider;
}

export class EventTriggerController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly agents: AgentSet;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly questController?: QuestProgressionController;

  private readonly logger?: GameLogger;

  private readonly now: TimestampProvider;

  constructor(options: EventTriggerControllerOptions) {
    this.store = options.store;
    this.agents = options.agents;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.questController = options.questController;
    this.logger = options.logger;
    this.now = options.now ?? defaultTimestampProvider;
  }

  async triggerEvent(eventId: string, source: EventLogSource = 'manual') {
    const state = this.store.getState();
    const worldEvent = state.eventDefinitionsById[eventId];

    if (!worldEvent) {
      return null;
    }

    const evaluation =
      source === 'debug'
        ? {
            ok: true,
            eventId,
            reasons: ['调试路径已绕过触发条件校验'],
          }
        : evaluateEventTrigger(worldEvent, {
            currentAreaId: state.mapState.currentAreaId,
            questProgressEntries: state.questProgressOrder.map(
              (questId) => state.questProgressById[questId],
            ),
            playerTags: state.playerModel.tags,
            worldFlags: state.worldRuntime.flags,
            eventHistory: state.eventHistory,
            npcStatesById: state.npcStatesById,
          });

    if (!evaluation.ok) {
      return evaluation;
    }

    const effect = applyEventEffects(worldEvent.effects);

    if (effect.worldFlagsToSet.length > 0) {
      state.setWorldFlags(
        Object.fromEntries(effect.worldFlagsToSet.map((flag) => [flag, true])),
      );
    }

    if (effect.unlockAreaIds.length > 0) {
      state.setUnlockedAreaIds([
        ...state.mapState.unlockedAreaIds,
        ...effect.unlockAreaIds,
      ]);
    }

    for (const questId of effect.startQuestIds) {
      await this.questController?.activateQuest(questId);
    }

    for (const change of effect.npcTrustChanges) {
      const npcState = state.npcStatesById[change.npcId];
      if (!npcState) {
        continue;
      }

      state.upsertNpcState(
        applyNpcRelationChange(npcState, {
          trustDelta: change.delta,
          timestamp: this.now(),
          memoryNote: `世界事件“${worldEvent.title}”改变了该角色的信任度。`,
        }).state,
      );
    }

    state.appendEventHistory({
      eventId,
      triggeredAt: this.now(),
      source,
    });
    state.setEventDirector({
      ...state.eventDirector,
      pendingEventIds: state.eventDirector.pendingEventIds.filter(
        (pendingEventId) => pendingEventId !== eventId,
      ),
      worldTension: state.eventDirector.worldTension + 10,
    });

    this.eventBus?.emit('EVENT_TRIGGERED', {
      eventId,
      source,
      unlockedAreaIds: effect.unlockAreaIds,
      startedQuestIds: effect.startQuestIds,
    });

    await this.questController?.refreshQuestStatuses({
      autoSave: false,
    });

    await maybeAutoSave(
      this.store,
      this.saveController,
      source === 'debug' ? 'debug' : 'auto',
    );

    return {
      evaluation,
      effect,
    };
  }

  async evaluateDirectorEvent() {
    const state = this.store.getState();
    const result = await this.agents.gameMaster.run({
      currentAreaId: state.mapState.currentAreaId,
      activeQuestIds: state.questProgressOrder
        .map((questId) => state.questProgressById[questId])
        .filter((progress) => progress.status === 'active')
        .map((progress) => progress.questId),
      triggeredEvents: state.eventHistory,
      playerTags: state.playerModel.tags,
    });
    this.logger?.recordAgentDecision({
      agentId: 'game-master',
      createdAt: this.now(),
      inputSummary: `区域=${state.mapState.currentAreaId}，活动任务数=${state.questProgressOrder.length}`,
      outputSummary: result.eventToTrigger
        ? `已触发 ${result.eventToTrigger}`
        : '没有事件被触发',
      input: {
        currentAreaId: state.mapState.currentAreaId,
        playerTags: state.playerModel.tags,
      },
      output: result,
    });

    state.setEventDirector({
      ...state.eventDirector,
      pacingNote: result.pacingNote ?? state.eventDirector.pacingNote,
    });

    if (!result.eventToTrigger) {
      return result;
    }

    return this.triggerEvent(result.eventToTrigger);
  }
}
