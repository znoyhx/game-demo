import type { StoreApi } from 'zustand/vanilla';

import type {
  AppliedEventEffect,
  EventEvaluationContext,
} from '../rules/eventRules';
import { evaluateEventTrigger } from '../rules';
import type {
  DebugToolsState,
  EventDebugDirectorSnapshot,
  EventDebugEventSummary,
  EventDebugHistoryEntry,
  EventDebugOutcome,
  EventDebugOutcomeMode,
  EventDebugReplayRequest,
  EventDebugSnapshot,
  EventLogEntry,
  WorldEvent,
} from '../schemas';
import {
  eventDebugOutcomeSchema,
  eventDebugReplayRequestSchema,
  eventDebugSnapshotSchema,
} from '../schemas';
import type { GameStoreState } from '../state';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { EventTriggerController } from './eventTriggerController';

interface EventDebugControllerOptions {
  store: StoreApi<GameStoreState>;
  eventController: EventTriggerController;
  saveController?: SaveWriter;
  now?: TimestampProvider;
}

interface EventDebugBeforeState {
  worldRuntime: GameStoreState['worldRuntime'];
  mapState: GameStoreState['mapState'];
  areasById: GameStoreState['areasById'];
  npcDefinitionsById: GameStoreState['npcDefinitionsById'];
  questDefinitionsById: GameStoreState['questDefinitionsById'];
  eventDirector: GameStoreState['eventDirector'];
}

export class EventDebugController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly eventController: EventTriggerController;

  private readonly saveController?: SaveWriter;

  private readonly now: TimestampProvider;

  constructor(options: EventDebugControllerOptions) {
    this.store = options.store;
    this.eventController = options.eventController;
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

  private buildEvaluationContext(state: GameStoreState): EventEvaluationContext {
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

  private getEvent(eventId: string): WorldEvent | null {
    return this.store.getState().eventDefinitionsById[eventId] ?? null;
  }

  private buildDirectorSnapshot(
    state: GameStoreState = this.store.getState(),
  ): EventDebugDirectorSnapshot {
    return {
      randomnessDisabled: state.eventDirector.randomnessDisabled,
      worldTension: state.eventDirector.worldTension,
      pacingNote: state.eventDirector.pacingNote,
      pendingEventIds: [...state.eventDirector.pendingEventIds],
      scheduledEventIds: state.eventDirector.scheduledEvents.map(
        (event) => event.eventId,
      ),
      revealedClueCount: state.eventDirector.revealedClues.length,
      shopModifierCount: state.eventDirector.shopPriceModifiers.length,
      factionConflictCount: state.eventDirector.factionConflicts.length,
    };
  }

  private captureBeforeState(state: GameStoreState): EventDebugBeforeState {
    return structuredClone({
      worldRuntime: state.worldRuntime,
      mapState: state.mapState,
      areasById: state.areasById,
      npcDefinitionsById: state.npcDefinitionsById,
      questDefinitionsById: state.questDefinitionsById,
      eventDirector: state.eventDirector,
    });
  }

  private resolveEventHistorySummary(
    event: WorldEvent,
    state: GameStoreState,
  ): Pick<
    EventDebugEventSummary,
    'triggerCount' | 'lastTriggeredAt' | 'lastSource' | 'pending' | 'scheduled'
  > {
    const entries = state.eventHistory.filter((entry) => entry.eventId === event.id);
    const lastEntry = entries[entries.length - 1];

    return {
      triggerCount: entries.length,
      lastTriggeredAt: lastEntry?.triggeredAt,
      lastSource: lastEntry?.source,
      pending: state.eventDirector.pendingEventIds.includes(event.id),
      scheduled: state.eventDirector.scheduledEvents.some(
        (scheduled) => scheduled.eventId === event.id,
      ),
    };
  }

  private formatAreaName(
    areaId: string,
    state: Pick<GameStoreState, 'areasById'> | EventDebugBeforeState,
  ) {
    return state.areasById[areaId]?.name ?? areaId;
  }

  private formatNpcName(
    npcId: string,
    state:
      | Pick<GameStoreState, 'npcDefinitionsById'>
      | EventDebugBeforeState,
  ) {
    return state.npcDefinitionsById[npcId]?.name ?? npcId;
  }

  private formatQuestTitle(
    questId: string,
    state:
      | Pick<GameStoreState, 'questDefinitionsById'>
      | EventDebugBeforeState,
  ) {
    return state.questDefinitionsById[questId]?.title ?? questId;
  }

  private buildChangeSummary(
    event: WorldEvent,
    effect: AppliedEventEffect,
    beforeState: EventDebugBeforeState,
    afterState: GameStoreState,
  ) {
    const lines: string[] = [];

    if (effect.worldFlagsToSet.length > 0) {
      lines.push(`世界标记：${effect.worldFlagsToSet.join('、')}`);
    }

    if (effect.worldWeather !== undefined) {
      lines.push(
        `天气变化：${beforeState.worldRuntime.weather ?? '无'} → ${afterState.worldRuntime.weather ?? effect.worldWeather}`,
      );
    }

    if (effect.worldTimeOfDay !== undefined) {
      lines.push(
        `时间变化：${beforeState.worldRuntime.timeOfDay ?? '未设定'} → ${afterState.worldRuntime.timeOfDay ?? effect.worldTimeOfDay}`,
      );
    }

    if (effect.unlockAreaIds.length > 0) {
      lines.push(
        `开放区域：${effect.unlockAreaIds
          .map((areaId) => this.formatAreaName(areaId, afterState))
          .join('、')}`,
      );
    }

    if (effect.lockAreaIds.length > 0) {
      lines.push(
        `封锁区域：${effect.lockAreaIds
          .map((areaId) => this.formatAreaName(areaId, afterState))
          .join('、')}`,
      );
    }

    if (effect.startQuestIds.length > 0) {
      lines.push(
        `启动任务：${effect.startQuestIds
          .map((questId) => this.formatQuestTitle(questId, afterState))
          .join('、')}`,
      );
    }

    for (const reduction of effect.resourceReductions) {
      const beforeNode = beforeState.areasById[reduction.areaId]?.resourceNodes.find(
        (node) =>
          reduction.resourceNodeId ? node.id === reduction.resourceNodeId : true,
      );
      const afterNode = afterState.areasById[reduction.areaId]?.resourceNodes.find(
        (node) =>
          reduction.resourceNodeId ? node.id === reduction.resourceNodeId : true,
      );

      lines.push(
        `资源变化：${this.formatAreaName(reduction.areaId, afterState)} / ${
          beforeNode?.label ?? afterNode?.label ?? reduction.resourceNodeId ?? '资源点'
        } ${beforeNode?.quantity ?? '—'} → ${afterNode?.quantity ?? '—'}`,
      );
    }

    for (const movement of effect.npcMovements) {
      const beforeNpc = beforeState.npcDefinitionsById[movement.npcId];
      const afterNpc = afterState.npcDefinitionsById[movement.npcId];

      lines.push(
        `角色移动：${this.formatNpcName(movement.npcId, afterState)} ${this.formatAreaName(
          beforeNpc?.areaId ?? movement.toAreaId,
          beforeState,
        )} → ${this.formatAreaName(afterNpc?.areaId ?? movement.toAreaId, afterState)}`,
      );
    }

    for (const appearance of event.effects.bossAppearances ?? []) {
      lines.push(
        `首领现身：${this.formatNpcName(appearance.npcId, afterState)} 出现在 ${this.formatAreaName(
          appearance.areaId,
          afterState,
        )}`,
      );
    }

    for (const clue of event.effects.revealClues ?? []) {
      lines.push(`线索曝光：${clue.label}`);
    }

    for (const modifier of event.effects.setShopPriceModifiers ?? []) {
      const beforeModifier = beforeState.eventDirector.shopPriceModifiers.find(
        (entry) => entry.npcId === modifier.npcId,
      );
      const afterModifier = afterState.eventDirector.shopPriceModifiers.find(
        (entry) => entry.npcId === modifier.npcId,
      );

      lines.push(
        `商店价格：${this.formatNpcName(modifier.npcId, afterState)} ${
          beforeModifier?.multiplier ?? 1
        } → ${afterModifier?.multiplier ?? modifier.multiplier}`,
      );
    }

    for (const conflict of event.effects.registerFactionConflicts ?? []) {
      lines.push(`派系冲突：${conflict.label}（强度 ${conflict.intensity}）`);
    }

    if (lines.length === 0) {
      lines.push('该事件本次没有写入新的世界变化。');
    }

    return lines;
  }

  private buildOutcome(
    mode: EventDebugOutcomeMode,
    event: WorldEvent,
    naturalEvaluation: ReturnType<typeof evaluateEventTrigger>,
    effect: AppliedEventEffect,
    beforeState: EventDebugBeforeState,
    afterState: GameStoreState,
    replayEntry?: EventLogEntry & { index: number },
  ): EventDebugOutcome {
    const latestEntry =
      afterState.eventHistory
        .filter((entry) => entry.eventId === event.id)
        .slice(-1)[0] ?? null;

    return eventDebugOutcomeSchema.parse({
      mode,
      eventId: event.id,
      title: event.title,
      triggeredAt: latestEntry?.triggeredAt ?? this.now(),
      actualSource: 'debug',
      replayedFromIndex: replayEntry?.index,
      replayedFromTriggeredAt: replayEntry?.triggeredAt,
      naturalEvaluationOk: naturalEvaluation.ok,
      naturalReasons: naturalEvaluation.reasons,
      changeSummary: this.buildChangeSummary(event, effect, beforeState, afterState),
      directorAfter: this.buildDirectorSnapshot(afterState),
    });
  }

  getDebugSnapshot(): EventDebugSnapshot {
    const state = this.store.getState();

    const events = state.eventDefinitionOrder.map((eventId) => {
      const event = state.eventDefinitionsById[eventId];
      const naturalEvaluation = evaluateEventTrigger(
        event,
        this.buildEvaluationContext(state),
      );
      const historySummary = this.resolveEventHistorySummary(event, state);

      return {
        eventId: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        repeatable: event.repeatable,
        triggerCount: historySummary.triggerCount,
        lastTriggeredAt: historySummary.lastTriggeredAt,
        lastSource: historySummary.lastSource,
        naturallyTriggerable: naturalEvaluation.ok,
        naturalReasons: naturalEvaluation.reasons,
        pending: historySummary.pending,
        scheduled: historySummary.scheduled,
      };
    });

    const history = state.eventHistory.map((entry, index): EventDebugHistoryEntry => ({
      index,
      eventId: entry.eventId,
      title: state.eventDefinitionsById[entry.eventId]?.title ?? entry.eventId,
      triggeredAt: entry.triggeredAt,
      source: entry.source,
    }));

    return eventDebugSnapshotSchema.parse({
      events,
      history,
      director: this.buildDirectorSnapshot(state),
    });
  }

  async setRandomnessDisabled(disabled: boolean) {
    const state = this.store.getState();

    state.setEventDirector({
      ...state.eventDirector,
      randomnessDisabled: disabled,
    });
    this.enableDebugState();
    await maybeAutoSave(this.store, this.saveController, 'debug');
    return this.buildDirectorSnapshot();
  }

  async triggerEvent(eventId: string) {
    const event = this.getEvent(eventId);

    if (!event) {
      return null;
    }

    const state = this.store.getState();
    const naturalEvaluation = evaluateEventTrigger(
      event,
      this.buildEvaluationContext(state),
    );
    const beforeState = this.captureBeforeState(state);

    this.enableDebugState({
      forcedEventId: eventId,
    });

    const result = await this.eventController.triggerEvent(eventId, 'debug');

    if (!result || !('effect' in result)) {
      return null;
    }

    return this.buildOutcome(
      'manual-trigger',
      event,
      naturalEvaluation,
      result.effect,
      beforeState,
      this.store.getState(),
    );
  }

  async replayEvent(request: EventDebugReplayRequest | number) {
    const normalizedRequest =
      typeof request === 'number'
        ? eventDebugReplayRequestSchema.parse({ historyIndex: request })
        : eventDebugReplayRequestSchema.parse(request);
    const state = this.store.getState();
    const replayEntry = state.eventHistory[normalizedRequest.historyIndex];

    if (!replayEntry) {
      return null;
    }

    const event = this.getEvent(replayEntry.eventId);

    if (!event) {
      return null;
    }

    const naturalEvaluation = evaluateEventTrigger(
      event,
      this.buildEvaluationContext(state),
    );
    const beforeState = this.captureBeforeState(state);

    this.enableDebugState({
      forcedEventId: event.id,
    });

    const result = await this.eventController.triggerEvent(event.id, 'debug');

    if (!result || !('effect' in result)) {
      return null;
    }

    return this.buildOutcome(
      'history-replay',
      event,
      naturalEvaluation,
      result.effect,
      beforeState,
      this.store.getState(),
      {
        ...replayEntry,
        index: normalizedRequest.historyIndex,
      },
    );
  }
}
