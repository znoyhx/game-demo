import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import type { GameStoreState } from '../state';
import { evaluateAreaAccess } from '../rules';

import { maybeAutoSave, type SaveWriter } from './controllerUtils';

interface AreaNavigationControllerOptions {
  store: StoreApi<GameStoreState>;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
}

export class AreaNavigationController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  constructor(options: AreaNavigationControllerOptions) {
    this.store = options.store;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
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

    if (options?.autoSave ?? true) {
      await maybeAutoSave(this.store, this.saveController, 'auto');
    }

    return access;
  }
}
