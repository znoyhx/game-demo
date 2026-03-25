import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type { EventLogSource, WorldEvent } from '../schemas';
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

  private buildEvaluationContext(state: GameStoreState) {
    return {
      currentAreaId: state.mapState.currentAreaId,
      questProgressEntries: state.questProgressOrder.map(
        (questId) => state.questProgressById[questId],
      ),
      playerTags: state.playerModel.tags,
      worldFlags: state.worldRuntime.flags,
      eventHistory: state.eventHistory,
      npcStatesById: state.npcStatesById,
      worldTimeOfDay: state.worldRuntime.timeOfDay,
      worldTension: state.eventDirector.worldTension,
    };
  }

  private resolveSuggestedSource(event: WorldEvent): EventLogSource {
    return event.triggerConditions[0]?.type ?? 'manual';
  }

  private findEligibleScheduledEvent(state: GameStoreState) {
    for (const scheduledEvent of state.eventDirector.scheduledEvents) {
      const event = state.eventDefinitionsById[scheduledEvent.eventId];

      if (!event) {
        continue;
      }

      const evaluation = evaluateEventTrigger(event, this.buildEvaluationContext(state));

      if (evaluation.ok) {
        return {
          event,
          scheduledEvent,
        };
      }
    }

    return null;
  }

  private resolveAreaEntryEvents(areaId: string): WorldEvent[] {
    const state = this.store.getState();
    const area = state.areasById[areaId];

    if (!area) {
      return [];
    }

    return area.eventIds
      .map((eventId) => state.eventDefinitionsById[eventId])
      .filter((event): event is WorldEvent => Boolean(event))
      .filter((event) =>
        event.triggerConditions.some(
          (condition) =>
            condition.type === 'location' &&
            (!condition.requiredAreaId || condition.requiredAreaId === areaId),
        ),
      );
  }

  async triggerEvent(
    eventId: string,
    source: EventLogSource = 'manual',
    options?: {
      autoSave?: boolean;
    },
  ) {
    const state = this.store.getState();
    const worldEvent = state.eventDefinitionsById[eventId];
    const timestamp = this.now();
    const areas = state.areaOrder.map((areaId) => state.areasById[areaId]);
    const npcDefinitions = state.npcDefinitionOrder.map(
      (npcId) => state.npcDefinitionsById[npcId],
    );

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
        : evaluateEventTrigger(worldEvent, this.buildEvaluationContext(state));

    if (!evaluation.ok) {
      return evaluation;
    }

    const effect = applyEventEffects(eventId, worldEvent.effects, {
      areas,
      factions: state.worldDefinition.factions,
      npcDefinitions,
      eventDirector: state.eventDirector,
      timestamp,
    });

    if (effect.worldFlagsToSet.length > 0) {
      state.setWorldFlags(
        Object.fromEntries(effect.worldFlagsToSet.map((flag) => [flag, true])),
      );
    }

    if (effect.worldWeather !== undefined) {
      state.setWorldWeather(effect.worldWeather);
    }

    if (effect.worldTimeOfDay !== undefined) {
      state.setWorldTimeOfDay(effect.worldTimeOfDay);
    }

    if (effect.areas !== areas) {
      state.setAreas(effect.areas);
    }

    if (effect.npcDefinitions !== npcDefinitions) {
      state.setNpcDefinitions(effect.npcDefinitions);
    }

    if (effect.factions !== state.worldDefinition.factions) {
      state.setWorldDefinition({
        ...state.worldDefinition,
        factions: effect.factions,
      });
    }

    if (effect.unlockAreaIds.length > 0 || effect.lockAreaIds.length > 0) {
      const currentState = this.store.getState();
      const nextUnlockedAreaIds = Array.from(
        new Set([
          ...currentState.mapState.unlockedAreaIds,
          ...effect.unlockAreaIds,
        ]),
      ).filter((areaId) => !effect.lockAreaIds.includes(areaId));

      currentState.setUnlockedAreaIds(nextUnlockedAreaIds);
    }

    for (const questId of effect.startQuestIds) {
      await this.questController?.activateQuest(questId, {
        autoSave: false,
      });
    }

    for (const change of effect.npcTrustChanges) {
      const npcState = state.npcStatesById[change.npcId];
      if (!npcState) {
        continue;
      }

      state.upsertNpcState(
        applyNpcRelationChange(npcState, {
          trustDelta: change.delta,
          timestamp,
          memoryNote: `世界事件“${worldEvent.title}”改变了该角色的信任度。`,
        }).state,
      );
    }

    state.appendEventHistory({
      eventId,
      triggeredAt: timestamp,
      source,
    });
    state.setEventDirector({
      ...state.eventDirector,
      pendingEventIds: state.eventDirector.pendingEventIds.filter(
        (pendingEventId) => pendingEventId !== eventId,
      ),
      scheduledEvents: state.eventDirector.scheduledEvents.filter(
        (scheduledEvent) => scheduledEvent.eventId !== eventId,
      ),
      worldTension: state.eventDirector.worldTension + 10,
      revealedClues: effect.revealedClues,
      shopPriceModifiers: effect.shopPriceModifiers,
      factionConflicts: effect.factionConflicts,
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

    if (options?.autoSave !== false) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        source === 'debug' ? 'debug' : 'auto',
      );
    }

    return {
      evaluation,
      effect,
    };
  }

  async triggerAreaEntryEvents(
    areaId: string,
    options?: {
      autoSave?: boolean;
    },
  ) {
    const results = [];

    for (const event of this.resolveAreaEntryEvents(areaId)) {
      results.push(
        await this.triggerEvent(event.id, 'location', {
          autoSave: false,
        }),
      );
    }

    if (options?.autoSave ?? true) {
      await maybeAutoSave(this.store, this.saveController, 'auto');
    }

    return results;
  }

  async evaluateDirectorEvent() {
    const state = this.store.getState();
    const availableEvents = state.eventDefinitionOrder
      .map((eventId) => state.eventDefinitionsById[eventId])
      .filter((event): event is WorldEvent => Boolean(event));
    const result = await this.agents.gameMaster.run({
      currentAreaId: state.mapState.currentAreaId,
      activeQuestIds: state.questProgressOrder
        .map((questId) => state.questProgressById[questId])
        .filter((progress) => progress.status === 'active')
        .map((progress) => progress.questId),
      triggeredEvents: state.eventHistory,
      playerTags: state.playerModel.tags,
      worldFlags: state.worldRuntime.flags,
      worldTension: state.eventDirector.worldTension,
      timeOfDay: state.worldRuntime.timeOfDay,
      availableEvents,
      pendingEvents: state.eventDirector.scheduledEvents,
    });
    this.logger?.recordAgentDecision({
      agentId: 'game-master',
      createdAt: this.now(),
      inputSummary: `区域=${state.mapState.currentAreaId}，活动任务数=${state.questProgressOrder.length}`,
      outputSummary: result.eventToTrigger
        ? `已触发 ${result.eventToTrigger}`
        : result.scheduledEvents.length > 0
          ? `已调度 ${result.scheduledEvents.length} 个事件`
          : '没有事件被触发',
      input: {
        currentAreaId: state.mapState.currentAreaId,
        playerTags: state.playerModel.tags,
        worldTension: state.eventDirector.worldTension,
      },
      output: result,
    });

    const nextScheduledEvents = Array.from(
      new Map(
        [...state.eventDirector.scheduledEvents, ...result.scheduledEvents].map((event) => [
          event.eventId,
          event,
        ]),
      ).values(),
    );

    state.setEventDirector({
      ...state.eventDirector,
      pacingNote: result.pacingNote ?? state.eventDirector.pacingNote,
      scheduledEvents: nextScheduledEvents,
      pendingEventIds: Array.from(
        new Set([
          ...state.eventDirector.pendingEventIds,
          ...nextScheduledEvents.map((event) => event.eventId),
        ]),
      ),
      worldTension: Math.max(
        0,
        state.eventDirector.worldTension + (result.worldTensionDelta ?? 0),
      ),
    });

    const refreshedState = this.store.getState();
    const scheduledCandidate = this.findEligibleScheduledEvent(refreshedState);
    const directEvent = result.eventToTrigger
      ? refreshedState.eventDefinitionsById[result.eventToTrigger]
      : null;

    if (!directEvent && !scheduledCandidate) {
      return result;
    }

    if (directEvent) {
      return this.triggerEvent(directEvent.id, this.resolveSuggestedSource(directEvent));
    }

    return this.triggerEvent(
      scheduledCandidate!.event.id,
      this.resolveSuggestedSource(scheduledCandidate!.event),
    );
  }
}
