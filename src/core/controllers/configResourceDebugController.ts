import type { StoreApi } from 'zustand/vanilla';

import { findAreaBackgroundResource } from '../resources';
import {
  type GameConfigState,
  type GameDifficulty,
  gameConfigStateSchema,
  resourceStateSchema,
} from '../schemas';
import type { GameStoreState } from '../state';

import { maybeAutoSave, type SaveWriter } from './controllerUtils';

export type RuntimeConfigProfile = 'standard' | 'presentation' | 'dev';

interface ConfigResourceDebugControllerOptions {
  store: StoreApi<GameStoreState>;
  saveController?: SaveWriter;
}

export class ConfigResourceDebugController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly saveController?: SaveWriter;

  constructor(options: ConfigResourceDebugControllerOptions) {
    this.store = options.store;
    this.saveController = options.saveController;
  }

  private markDebugSession() {
    this.store.getState().patchDebugToolsState({
      debugModeEnabled: true,
      logsPanelOpen: true,
    });
  }

  private async persistDebugMutation() {
    this.markDebugSession();
    await maybeAutoSave(this.store, this.saveController, 'debug');
  }

  private commitConfig(nextConfig: GameConfigState) {
    const validatedConfig = gameConfigStateSchema.parse(nextConfig);
    this.store.getState().setGameConfig(validatedConfig);
    return validatedConfig;
  }

  async applyRuntimeProfile(profile: RuntimeConfigProfile) {
    const currentConfig = this.store.getState().gameConfig;
    const nextConfig = this.commitConfig({
      ...currentConfig,
      devModeEnabled: profile === 'dev',
      presentationModeEnabled: profile === 'presentation',
    });

    await this.persistDebugMutation();

    return nextConfig;
  }

  async setDifficulty(difficulty: GameDifficulty) {
    const currentConfig = this.store.getState().gameConfig;
    const nextConfig = this.commitConfig({
      ...currentConfig,
      difficulty,
    });

    await this.persistDebugMutation();

    return nextConfig;
  }

  async setAutosaveEnabled(autosaveEnabled: boolean) {
    const currentConfig = this.store.getState().gameConfig;
    const nextConfig = this.commitConfig({
      ...currentConfig,
      autosaveEnabled,
    });

    await this.persistDebugMutation();

    return nextConfig;
  }

  async setAutoLoadEnabled(autoLoadEnabled: boolean) {
    const currentConfig = this.store.getState().gameConfig;
    const nextConfig = this.commitConfig({
      ...currentConfig,
      autoLoadEnabled,
    });

    await this.persistDebugMutation();

    return nextConfig;
  }

  async syncAreaResourceSelection(areaId: string) {
    const state = this.store.getState();
    const area = state.areasById[areaId];

    if (!area) {
      return null;
    }

    const registeredBackground = findAreaBackgroundResource(areaId);
    const nextResourceState = resourceStateSchema.parse({
      ...state.resourceState,
      selectedBackgroundKey:
        registeredBackground?.key ??
        area.backgroundKey ??
        state.resourceState.selectedBackgroundKey,
      selectedMusicKey: area.musicKey ?? state.resourceState.selectedMusicKey,
    });

    state.setResourceState(nextResourceState);
    await this.persistDebugMutation();

    return nextResourceState;
  }

  async setLoadedResource(resourceKey: string, shouldLoad: boolean) {
    const state = this.store.getState();
    const currentKeys = state.resourceState.loadedResourceKeys;
    const nextLoadedKeys = shouldLoad
      ? Array.from(new Set([...currentKeys, resourceKey]))
      : currentKeys.filter((key) => key !== resourceKey);
    const nextResourceState = resourceStateSchema.parse({
      ...state.resourceState,
      loadedResourceKeys: nextLoadedKeys,
    });

    state.setResourceState(nextResourceState);
    await this.persistDebugMutation();

    return nextResourceState;
  }
}
