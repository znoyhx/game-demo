import { z } from 'zod';

import {
  areaSchema,
  legacyAreaSchema,
  saveSnapshotSchema,
  type LoadResult,
  type SaveSnapshot,
} from '../schemas';
import { ensureAreaSceneDefinition } from '../utils/areaSceneDefinition';

export const CURRENT_SAVE_SCHEMA_VERSION = '0.4.0';

const migrateableSaveSnapshotSchema = saveSnapshotSchema.extend({
  areas: z.array(z.union([areaSchema, legacyAreaSchema])),
});

type MigrateableSaveSnapshot = z.infer<typeof migrateableSaveSnapshotSchema>;

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
    const parsedSnapshot = migrateableSaveSnapshotSchema.safeParse(snapshot);

    if (!parsedSnapshot.success) {
      return {
        ok: false,
        reason: 'migration-failed',
      };
    }

    const normalizedSnapshot = this.upgradeToCurrentVersion(parsedSnapshot.data);

    return {
      ok: true,
      snapshot: normalizedSnapshot,
    };
  }

  private upgradeToCurrentVersion(snapshot: MigrateableSaveSnapshot): SaveSnapshot {
    return saveSnapshotSchema.parse({
      ...snapshot,
      areas: snapshot.areas.map((area) => ensureAreaSceneDefinition(area)),
      metadata: {
        ...snapshot.metadata,
        version: this.currentVersion,
      },
    });
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
