import type { StoreApi } from 'zustand/vanilla';

import { mockSaveSnapshot } from '../mocks';
import type {
  DebugToolsState,
  NpcState,
  PlayerProfileTag,
  QuestProgress,
  QuestStatus,
  SaveSnapshot,
} from '../schemas';
import type { GameStoreState } from '../state';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { AreaNavigationController } from './areaNavigationController';
import { CombatController } from './combatController';
import { EventTriggerController } from './eventTriggerController';
import { PlayerModelController } from './playerModelController';
import { QuestProgressionController } from './questProgressionController';

interface DebugScenarioControllerOptions {
  store: StoreApi<GameStoreState>;
  saveController?: SaveWriter;
  areaController?: AreaNavigationController;
  questController?: QuestProgressionController;
  combatController?: CombatController;
  eventController?: EventTriggerController;
  playerModelController?: PlayerModelController;
  now?: TimestampProvider;
}

export class DebugScenarioController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly saveController?: SaveWriter;

  private readonly areaController?: AreaNavigationController;

  private readonly questController?: QuestProgressionController;

  private readonly combatController?: CombatController;

  private readonly eventController?: EventTriggerController;

  private readonly playerModelController?: PlayerModelController;

  private readonly now: TimestampProvider;

  constructor(options: DebugScenarioControllerOptions) {
    this.store = options.store;
    this.saveController = options.saveController;
    this.areaController = options.areaController;
    this.questController = options.questController;
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
