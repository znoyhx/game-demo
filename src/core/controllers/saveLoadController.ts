import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import { mockSaveSnapshot } from '../mocks';
import type { StorageAdapter } from '../persistence/storageAdapter';
import type { LoadResult, SaveSource, SaveSnapshot } from '../schemas';
import type { GameStoreState } from '../state';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  SchemaSaveValidator,
  VersionedSaveMigrator,
  type SaveMigrator,
  type SaveValidator,
} from '../rules';

import { defaultTimestampProvider, type TimestampProvider } from './controllerUtils';

interface SaveLoadControllerOptions {
  storageAdapter: StorageAdapter;
  store: StoreApi<GameStoreState>;
  eventBus?: GameEventBus;
  now?: TimestampProvider;
  saveValidator?: SaveValidator;
  saveMigrator?: SaveMigrator;
}

export class SaveLoadController {
  private readonly storageAdapter: StorageAdapter;

  private readonly store: StoreApi<GameStoreState>;

  private readonly eventBus?: GameEventBus;

  private readonly now: TimestampProvider;

  private readonly saveValidator: SaveValidator;

  private readonly saveMigrator: SaveMigrator;

  constructor(options: SaveLoadControllerOptions) {
    this.storageAdapter = options.storageAdapter;
    this.store = options.store;
    this.eventBus = options.eventBus;
    this.now = options.now ?? defaultTimestampProvider;
    this.saveValidator = options.saveValidator ?? new SchemaSaveValidator();
    this.saveMigrator = options.saveMigrator ?? new VersionedSaveMigrator();
  }

  async saveNow(source: SaveSource): Promise<void> {
    const state = this.store.getState();
    const timestamp = this.now();

    state.setSaveStatus('saving');

    const metadata = {
      ...state.saveMetadata,
      id: state.saveMetadata.id || `save:${timestamp}`,
      updatedAt: timestamp,
      createdAt: state.saveMetadata.createdAt || timestamp,
      source,
      version: CURRENT_SAVE_SCHEMA_VERSION,
    };
    const snapshot = state.exportSaveSnapshot(metadata);
    const validation = this.saveValidator.validate(snapshot);

    if (!validation.ok || !validation.snapshot) {
      state.setSaveStatus('error');
      throw new Error(validation.reason ?? 'save validation failed');
    }

    await this.storageAdapter.writeSave(validation.snapshot);

    state.setSaveMetadata(validation.snapshot.metadata);
    state.setSaveStatus('saved');
    state.setAvailableSaveSlots(await this.storageAdapter.listSaves());

    this.eventBus?.emit('SAVE_CREATED', {
      saveId: validation.snapshot.metadata.id,
      source,
      updatedAt: validation.snapshot.metadata.updatedAt,
    });
  }

  async loadLatest(): Promise<LoadResult> {
    const state = this.store.getState();
    const rawSave = await this.storageAdapter.getLatestSave();

    if (rawSave === null) {
      state.setLastLoadState({ ok: false, reason: 'missing' });
      return {
        ok: false,
        reason: 'missing',
      };
    }

    const validation = this.saveValidator.validate(rawSave);
    const result =
      validation.ok && validation.snapshot
        ? validation
        : this.saveMigrator.migrate(rawSave);

    if (!result.ok || !result.snapshot) {
      state.setLastLoadState({ ok: false, reason: result.reason });
      return result;
    }

    state.hydrateFromSnapshot(result.snapshot);
    state.setLastLoadState({ ok: true });
    state.setSaveStatus('hydrated');
    state.setAvailableSaveSlots(await this.storageAdapter.listSaves());

    this.eventBus?.emit('SAVE_RESTORED', {
      saveId: result.snapshot.metadata.id,
      updatedAt: result.snapshot.metadata.updatedAt,
    });

    return result;
  }

  async listSaves() {
    const saves = await this.storageAdapter.listSaves();
    this.store.getState().setAvailableSaveSlots(saves);
    return saves;
  }

  async resetToDefault(snapshot: SaveSnapshot = mockSaveSnapshot): Promise<void> {
    await this.storageAdapter.clearLatestSave();

    const state = this.store.getState();
    state.hydrateFromSnapshot(snapshot);
    state.setLastLoadState({ ok: false, reason: 'missing' });
    state.setAvailableSaveSlots([]);
    state.setRecoveryNotice(null);
  }
}
