import { saveSnapshotSchema, type LoadResult, type SaveSnapshot } from '../schemas';

export const CURRENT_SAVE_SCHEMA_VERSION = '0.2.0';

export interface SaveValidator {
  validate(snapshot: unknown): LoadResult;
}

export interface SaveMigrator {
  migrate(snapshot: unknown): LoadResult;
}

export class SchemaSaveValidator implements SaveValidator {
  validate(snapshot: unknown): LoadResult {
    const parsedSnapshot = saveSnapshotSchema.safeParse(snapshot);

    if (!parsedSnapshot.success) {
      return {
        ok: false,
        reason: 'invalid',
      };
    }

    return {
      ok: true,
      snapshot: parsedSnapshot.data,
    };
  }
}

export class VersionedSaveMigrator implements SaveMigrator {
  constructor(private readonly currentVersion = CURRENT_SAVE_SCHEMA_VERSION) {}

  migrate(snapshot: unknown): LoadResult {
    const parsedSnapshot = saveSnapshotSchema.safeParse(snapshot);

    if (!parsedSnapshot.success) {
      return {
        ok: false,
        reason: 'migration-failed',
      };
    }

    if (parsedSnapshot.data.metadata.version === this.currentVersion) {
      return {
        ok: true,
        snapshot: parsedSnapshot.data,
      };
    }

    return {
      ok: true,
      snapshot: this.upgradeToCurrentVersion(parsedSnapshot.data),
    };
  }

  private upgradeToCurrentVersion(snapshot: SaveSnapshot): SaveSnapshot {
    return {
      ...snapshot,
      metadata: {
        ...snapshot.metadata,
        version: this.currentVersion,
      },
    };
  }
}

export const validateSaveSnapshot = (snapshot: unknown): LoadResult =>
  new SchemaSaveValidator().validate(snapshot);

export const migrateSaveSnapshot = (snapshot: unknown): LoadResult =>
  new VersionedSaveMigrator().migrate(snapshot);

export const validateOrMigrateSaveSnapshot = (snapshot: unknown): LoadResult => {
  const validation = validateSaveSnapshot(snapshot);
  if (
    validation.ok &&
    validation.snapshot?.metadata.version === CURRENT_SAVE_SCHEMA_VERSION
  ) {
    return validation;
  }

  return migrateSaveSnapshot(snapshot);
};
