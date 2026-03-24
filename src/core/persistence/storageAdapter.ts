import { saveSnapshotSchema } from '../schemas';
import type { SaveSnapshot } from '../schemas';

export interface SaveSlotSummary {
  id: string;
  label: string;
  updatedAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface StorageAdapter {
  listSaves(): Promise<SaveSlotSummary[]>;
  getLatestSave(): Promise<unknown | null>;
  writeSave(snapshot: SaveSnapshot): Promise<void>;
  clearLatestSave(): Promise<void>;
}

export const DEFAULT_SAVE_STORAGE_KEY = 'pixelforge-agent/latest-save';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly storageKey: string = DEFAULT_SAVE_STORAGE_KEY,
    private readonly storage?: StorageLike,
  ) {}

  private resolveStorage(): StorageLike | null {
    if (this.storage) {
      return this.storage;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }

    return null;
  }

  async listSaves(): Promise<SaveSlotSummary[]> {
    const latestSave = await this.getLatestSave();
    const parsedSave = saveSnapshotSchema.safeParse(latestSave);

    if (!parsedSave.success) {
      return [];
    }

    return [
      {
        id: parsedSave.data.metadata.id,
        label:
          parsedSave.data.metadata.label ??
          parsedSave.data.metadata.slot ??
          '最近存档',
        updatedAt: parsedSave.data.metadata.updatedAt,
      },
    ];
  }

  async getLatestSave(): Promise<unknown | null> {
    const storage = this.resolveStorage();

    if (!storage) {
      return null;
    }

    const rawSave = storage.getItem(this.storageKey);

    if (!rawSave) {
      return null;
    }

    return JSON.parse(rawSave) as unknown;
  }

  async writeSave(snapshot: SaveSnapshot): Promise<void> {
    const storage = this.resolveStorage();

    if (!storage) {
      return;
    }

    storage.setItem(this.storageKey, JSON.stringify(snapshot));
  }

  async clearLatestSave(): Promise<void> {
    const storage = this.resolveStorage();

    if (!storage) {
      return;
    }

    storage.removeItem(this.storageKey);
  }
}
