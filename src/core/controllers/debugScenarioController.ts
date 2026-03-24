import type { StoreApi } from 'zustand/vanilla';

import { mockSaveSnapshot } from '../mocks';
import type {
  DebugToolsState,
  NpcDebugStateInjection,
  NpcDialogueIntent,
  NpcState,
  PlayerProfileTag,
  QuestProgress,
  QuestStatus,
  SaveSnapshot,
  SessionSnapshot,
} from '../schemas';
import { npcDebugStateInjectionSchema } from '../schemas';
import type { GameStoreState } from '../state';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { AreaDebugController } from './areaDebugController';
import { AreaNavigationController } from './areaNavigationController';
import { CombatController } from './combatController';
import { EventTriggerController } from './eventTriggerController';
import { NpcInteractionController } from './npcInteractionController';
import { PlayerModelController } from './playerModelController';
import { QuestProgressionController } from './questProgressionController';

interface DebugScenarioControllerOptions {
  store: StoreApi<GameStoreState>;
  saveController?: SaveWriter;
  areaDebugController?: AreaDebugController;
  areaController?: AreaNavigationController;
  questController?: QuestProgressionController;
  npcController?: NpcInteractionController;
  combatController?: CombatController;
  eventController?: EventTriggerController;
  playerModelController?: PlayerModelController;
  now?: TimestampProvider;
}

export class DebugScenarioController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly saveController?: SaveWriter;

  private readonly areaDebugController?: AreaDebugController;

  private readonly areaController?: AreaNavigationController;

  private readonly questController?: QuestProgressionController;

  private readonly npcController?: NpcInteractionController;

  private readonly combatController?: CombatController;

  private readonly eventController?: EventTriggerController;

  private readonly playerModelController?: PlayerModelController;

  private readonly now: TimestampProvider;

  private readonly npcBaselines = new Map<
    string,
    {
      saveSnapshot: SaveSnapshot;
      sessionSnapshot: SessionSnapshot;
    }
  >();

  constructor(options: DebugScenarioControllerOptions) {
    this.store = options.store;
    this.saveController = options.saveController;
    this.areaDebugController = options.areaDebugController;
    this.areaController = options.areaController;
    this.questController = options.questController;
    this.npcController = options.npcController;
    this.combatController = options.combatController;
    this.eventController = options.eventController;
    this.playerModelController = options.playerModelController;
    this.now = options.now ?? defaultTimestampProvider;
  }

  private enableDebugState(patch: Partial<DebugToolsState>) {
    this.store.getState().patchDebugToolsState({
      debugModeEnabled: true,
      ...patch,
    });
  }

  async loadScenario(snapshot: SaveSnapshot = mockSaveSnapshot) {
    this.store.getState().hydrateFromSnapshot(snapshot);
    this.enableDebugState({
      activeScenarioId: snapshot.metadata.id,
      logsPanelOpen: true,
    });
    await maybeAutoSave(this.store, this.saveController, 'debug');
  }

  async forceArea(areaId: string) {
    if (this.areaDebugController) {
      return this.areaDebugController.jumpToArea(areaId, {
        autoSave: true,
      });
    }

    this.enableDebugState({
      forcedAreaId: areaId,
    });

    return this.areaController?.enterArea(areaId, {
      ignoreConnectivity: true,
      autoSave: false,
    });
  }

  async forceQuestStatus(questId: string, status: QuestStatus) {
    this.enableDebugState({
      forcedQuestId: questId,
    });
    return this.questController?.forceQuestStatus(questId, status);
  }

  async forceNpcState(npcId: string, patch: Partial<NpcState>) {
    const state = this.store.getState();
    const currentState = state.npcStatesById[npcId];
    if (!currentState) {
      return null;
    }

    const nextState: NpcState = {
      ...currentState,
      ...patch,
    };

    state.upsertNpcState(nextState);
    this.enableDebugState({
      forcedNpcId: npcId,
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');
    return nextState;
  }

  async injectNpcState(request: NpcDebugStateInjection) {
    const normalized = npcDebugStateInjectionSchema.parse(request);
    const currentState = this.store.getState().npcStatesById[normalized.npcId];

    if (!currentState) {
      return null;
    }

    return this.forceNpcState(normalized.npcId, {
      trust: normalized.trust ?? currentState.trust,
      relationship: normalized.relationship ?? currentState.relationship,
      currentDisposition:
        normalized.currentDisposition ?? currentState.currentDisposition,
      emotionalState: normalized.emotionalState ?? currentState.emotionalState,
      currentGoal: normalized.currentGoal ?? currentState.currentGoal,
      memory: {
        ...currentState.memory,
        shortTerm: normalized.shortTermMemory ?? currentState.memory.shortTerm,
        longTerm: normalized.longTermMemory ?? currentState.memory.longTerm,
        lastInteractionAt:
          normalized.lastInteractionAt === null
            ? undefined
            : normalized.lastInteractionAt ?? currentState.memory.lastInteractionAt,
      },
    });
  }

  private captureNpcBaseline(npcId: string) {
    if (this.npcBaselines.has(npcId)) {
      return;
    }

    const state = this.store.getState();
    this.npcBaselines.set(npcId, {
      saveSnapshot: state.exportSaveSnapshot(),
      sessionSnapshot: state.exportSessionSnapshot(),
    });
  }

  async openNpcDialogue(npcId: string) {
    this.enableDebugState({
      forcedNpcId: npcId,
      logsPanelOpen: true,
    });

    return this.npcController?.startDialogue(npcId) ?? null;
  }

  async testNpcDialogueBranch(npcId: string, optionId: NpcDialogueIntent) {
    if (!this.npcController) {
      return null;
    }

    this.captureNpcBaseline(npcId);
    this.enableDebugState({
      forcedNpcId: npcId,
      logsPanelOpen: true,
    });

    if (!this.npcController.getDialogueState(npcId)) {
      await this.npcController.startDialogue(npcId);
    }

    return this.npcController.chooseDialogueOption(npcId, optionId);
  }

  async resetNpcDebugState(npcId: string) {
    const baseline = this.npcBaselines.get(npcId);

    if (!baseline) {
      return null;
    }

    this.store.getState().hydrateFromSnapshot(baseline.saveSnapshot);
    this.store.getState().hydrateFromSessionSnapshot(baseline.sessionSnapshot);
    this.enableDebugState({
      forcedNpcId: npcId,
      logsPanelOpen: true,
    });
    this.npcBaselines.delete(npcId);
    await maybeAutoSave(this.store, this.saveController, 'debug');
    return this.store.getState().npcStatesById[npcId] ?? null;
  }

  async forceEncounter(encounterId: string) {
    this.enableDebugState({
      forcedEncounterId: encounterId,
    });
    return this.combatController?.startEncounter(encounterId);
  }

  async forceEvent(eventId: string) {
    this.enableDebugState({
      forcedEventId: eventId,
    });
    return this.eventController?.triggerEvent(eventId, 'debug');
  }

  async injectPlayerTags(tags: PlayerProfileTag[]) {
    this.enableDebugState({
      injectedPlayerTags: tags,
    });
    await this.playerModelController?.injectPlayerTags(tags);
  }

  async upsertQuestProgress(progress: QuestProgress) {
    this.store.getState().upsertQuestProgress({
      ...progress,
      updatedAt: this.now(),
    });
    await maybeAutoSave(this.store, this.saveController, 'debug');
  }

  async resetToMockWorld() {
    this.store.getState().resetToMockSnapshot();
    this.enableDebugState({
      activeScenarioId: mockSaveSnapshot.metadata.id,
      forcedAreaId: null,
      forcedQuestId: null,
      forcedNpcId: null,
      forcedEncounterId: null,
      forcedEventId: null,
      injectedPlayerTags: [],
    });
    await maybeAutoSave(this.store, this.saveController, 'debug');
  }
}
