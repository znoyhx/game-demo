import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import type { GameStoreState } from '../state';
import { evaluateAreaAccess } from '../rules';

import { maybeAutoSave, type SaveWriter } from './controllerUtils';
import type { PlayerModelController } from './playerModelController';
import type { QuestProgressionController } from './questProgressionController';

interface AreaNavigationControllerOptions {
  store: StoreApi<GameStoreState>;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  questController?: QuestProgressionController;
  playerModelController?: PlayerModelController;
  explorationController?: {
    handleAreaEnter: (
      areaId: string,
      options?: {
        autoSave?: boolean;
      },
    ) => Promise<unknown>;
  };
  eventController?: {
    triggerAreaEntryEvents: (
      areaId: string,
      options?: {
        autoSave?: boolean;
      },
    ) => Promise<unknown>;
  };
}

export class AreaNavigationController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly questController?: QuestProgressionController;

  private readonly playerModelController?: PlayerModelController;

  private readonly explorationController?: AreaNavigationControllerOptions['explorationController'];

  private readonly eventController?: AreaNavigationControllerOptions['eventController'];

  constructor(options: AreaNavigationControllerOptions) {
    this.store = options.store;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.questController = options.questController;
    this.playerModelController = options.playerModelController;
    this.explorationController = options.explorationController;
    this.eventController = options.eventController;
  }

  async enterArea(
    areaId: string,
    options?: {
      ignoreConnectivity?: boolean;
      autoSave?: boolean;
    },
  ) {
    const state = this.store.getState();
    const currentArea = state.areasById[state.mapState.currentAreaId] ?? null;
    const targetArea = state.areasById[areaId];

    if (!targetArea) {
      return null;
    }

    const access = evaluateAreaAccess({
      currentArea,
      targetArea,
      unlockedAreaIds: state.mapState.unlockedAreaIds,
      questProgress: state.questProgressOrder.map(
        (questId) => state.questProgressById[questId],
      ),
      worldFlags: state.worldRuntime.flags,
      npcStatesById: state.npcStatesById,
      ignoreConnectivity: options?.ignoreConnectivity,
    });

    if (!access.ok) {
      return access;
    }

    if (access.shouldUnlock) {
      state.setUnlockedAreaIds([...state.mapState.unlockedAreaIds, targetArea.id]);
    }

    state.setCurrentAreaId(targetArea.id);
    state.setSelectedAreaId(targetArea.id);
    state.setActivePanel('map');

    this.eventBus?.emit('AREA_ENTERED', {
      areaId: targetArea.id,
      previousAreaId: currentArea?.id,
      unlockedAreaIds: this.store.getState().mapState.unlockedAreaIds,
    });

    await this.eventController?.triggerAreaEntryEvents(targetArea.id, {
      autoSave: false,
    });

    await this.playerModelController?.recordAreaVisit(targetArea.id, {
      autoSave: false,
      appendRecentVisit: false,
    });

    await this.explorationController?.handleAreaEnter(targetArea.id, {
      autoSave: false,
    });

    await this.questController?.refreshQuestStatuses({
      autoSave: false,
    });

    if (options?.autoSave ?? true) {
      await maybeAutoSave(this.store, this.saveController, 'auto');
    }

    return access;
  }
}
