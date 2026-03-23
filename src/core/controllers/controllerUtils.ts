import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import type { SaveSource } from '../schemas';
import type { GameStoreState } from '../state';

export type TimestampProvider = () => string;

export interface SaveWriter {
  saveNow(source: SaveSource): Promise<void>;
}

export interface BaseControllerOptions {
  store: StoreApi<GameStoreState>;
  eventBus?: GameEventBus;
  now?: TimestampProvider;
}

export const defaultTimestampProvider: TimestampProvider = () =>
  new Date().toISOString();

export const maybeAutoSave = async (
  store: StoreApi<GameStoreState>,
  saveWriter: SaveWriter | undefined,
  source: SaveSource = 'auto',
) => {
  if (!saveWriter) {
    return;
  }

  if (source !== 'auto' || store.getState().gameConfig.autosaveEnabled) {
    await saveWriter.saveNow(source);
  }
};
