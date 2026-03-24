import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import type {
  Area,
  AreaEnvironmentState,
  DebugToolsState,
} from '../schemas';
import type { GameStoreState } from '../state';
import {
  buildAreaEnvironmentDebugMutation,
  resolveAreaEnvironmentState,
} from '../rules';

import { maybeAutoSave, type SaveWriter } from './controllerUtils';

interface AreaDebugControllerOptions {
  store: StoreApi<GameStoreState>;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
}

export interface AreaDebugJumpResult {
  ok: true;
  areaId: string;
  previousAreaId?: string;
  discoveredAreaIds: string[];
  unlockedAreaIds: string[];
}

export interface AreaDebugAccessResult {
  ok: boolean;
  areaId: string;
  discoveredAreaIds: string[];
  unlockedAreaIds: string[];
  reason?: string;
}

export interface AreaDebugEnvironmentResult {
  ok: boolean;
  areaId: string;
  targetStateId: string;
  resolvedState?: AreaEnvironmentState;
  worldFlagPatch?: Record<string, boolean>;
  reason?: string;
}

const appendUnique = (ids: string[], value: string): string[] =>
  Array.from(new Set([...ids, value]));

export class AreaDebugController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  constructor(options: AreaDebugControllerOptions) {
    this.store = options.store;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
  }

  private enableDebugState(patch?: Partial<DebugToolsState>) {
    this.store.getState().patchDebugToolsState({
      debugModeEnabled: true,
      logsPanelOpen: true,
      ...patch,
    });
  }

  private getArea(areaId: string): Area | null {
    return this.store.getState().areasById[areaId] ?? null;
  }

  async jumpToArea(
    areaId: string,
    options?: {
      autoSave?: boolean;
      discover?: boolean;
      unlock?: boolean;
    },
  ): Promise<AreaDebugJumpResult | null> {
    const state = this.store.getState();
    const targetArea = this.getArea(areaId);

    if (!targetArea) {
      return null;
    }

    const previousAreaId = state.mapState.currentAreaId;
    const discover = options?.discover ?? true;
    const unlock = options?.unlock ?? true;

    if (discover) {
      state.setDiscoveredAreaIds(
        appendUnique(state.mapState.discoveredAreaIds, targetArea.id),
      );
    }

    if (unlock) {
      state.setUnlockedAreaIds(
        appendUnique(this.store.getState().mapState.unlockedAreaIds, targetArea.id),
      );
    }

    this.store.getState().setCurrentAreaId(targetArea.id);
    this.store.getState().setSelectedAreaId(targetArea.id);
    this.store.getState().setActivePanel('map');
    this.enableDebugState({
      forcedAreaId: null,
    });

    const nextState = this.store.getState();
    this.eventBus?.emit('AREA_ENTERED', {
      areaId: targetArea.id,
      previousAreaId,
      unlockedAreaIds: nextState.mapState.unlockedAreaIds,
    });

    if (options?.autoSave ?? true) {
      await maybeAutoSave(this.store, this.saveController, 'debug');
    }

    return {
      ok: true,
      areaId: targetArea.id,
      previousAreaId,
      discoveredAreaIds: nextState.mapState.discoveredAreaIds,
      unlockedAreaIds: nextState.mapState.unlockedAreaIds,
    };
  }

  async setAreaUnlocked(
    areaId: string,
    unlocked: boolean,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<AreaDebugAccessResult | null> {
    const state = this.store.getState();
    const area = this.getArea(areaId);

    if (!area) {
      return null;
    }

    if (!unlocked && area.unlockedByDefault) {
      return {
        ok: false,
        areaId,
        discoveredAreaIds: state.mapState.discoveredAreaIds,
        unlockedAreaIds: state.mapState.unlockedAreaIds,
        reason: 'default-unlocked areas cannot be relocked through runtime state',
      };
    }

    if (!unlocked && state.mapState.currentAreaId === areaId) {
      return {
        ok: false,
        areaId,
        discoveredAreaIds: state.mapState.discoveredAreaIds,
        unlockedAreaIds: state.mapState.unlockedAreaIds,
        reason: 'leave the current area before relocking it',
      };
    }

    const nextUnlockedAreaIds = unlocked
      ? appendUnique(state.mapState.unlockedAreaIds, areaId)
      : state.mapState.unlockedAreaIds.filter((entry) => entry !== areaId);

    state.setUnlockedAreaIds(nextUnlockedAreaIds);

    if (unlocked) {
      this.store.getState().setDiscoveredAreaIds(
        appendUnique(this.store.getState().mapState.discoveredAreaIds, areaId),
      );
    }

    this.enableDebugState({
      forcedAreaId: null,
    });

    if (options?.autoSave ?? true) {
      await maybeAutoSave(this.store, this.saveController, 'debug');
    }

    const nextState = this.store.getState();
    return {
      ok: true,
      areaId,
      discoveredAreaIds: nextState.mapState.discoveredAreaIds,
      unlockedAreaIds: nextState.mapState.unlockedAreaIds,
    };
  }

  async simulateEnvironmentState(
    areaId: string,
    targetStateId: string,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<AreaDebugEnvironmentResult | null> {
    const area = this.getArea(areaId);

    if (!area) {
      return null;
    }

    const mutation = buildAreaEnvironmentDebugMutation(area, targetStateId);

    if (!mutation) {
      return {
        ok: false,
        areaId,
        targetStateId,
        reason: 'target environment state does not exist for this area',
      };
    }

    this.store.getState().setWorldFlags(mutation.worldFlagPatch);
    this.enableDebugState({
      forcedAreaId: null,
    });

    if (options?.autoSave ?? true) {
      await maybeAutoSave(this.store, this.saveController, 'debug');
    }

    const resolvedState = resolveAreaEnvironmentState(
      area,
      this.store.getState().worldRuntime.flags,
    );

    return {
      ok: resolvedState.id === targetStateId,
      areaId,
      targetStateId,
      resolvedState,
      worldFlagPatch: mutation.worldFlagPatch,
      reason:
        resolvedState.id === targetStateId
          ? undefined
          : `resolved to ${resolvedState.id} after applying the debug mutation`,
    };
  }
}
