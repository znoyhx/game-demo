import { describe, expect, it } from 'vitest';

import { mockSaveSnapshot } from '../../src/core/mocks';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  migrateSaveSnapshot,
  validateSaveSnapshot,
} from '../../src/core/rules';

describe('save rules', () => {
  it('validates the current mock save snapshot', () => {
    const result = validateSaveSnapshot(mockSaveSnapshot);

    expect(result.ok).toBe(true);
    expect(result.snapshot?.metadata.id).toBe(mockSaveSnapshot.metadata.id);
  });

  it('migrates a schema-valid save to the current version when metadata differs', () => {
    const result = migrateSaveSnapshot({
      ...mockSaveSnapshot,
      metadata: {
        ...mockSaveSnapshot.metadata,
        version: '0.0.1',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.snapshot?.metadata.version).toBe(CURRENT_SAVE_SCHEMA_VERSION);
  });

  it('backfills explicit area scene data for legacy saves that only stored area metadata', () => {
    const legacySnapshot = {
      ...mockSaveSnapshot,
      metadata: {
        ...mockSaveSnapshot.metadata,
        version: '0.2.0',
      },
      areas: mockSaveSnapshot.areas.map((area) => {
        const legacyArea = { ...area };
        Reflect.deleteProperty(legacyArea, 'scene');
        return legacyArea;
      }),
    };

    const result = migrateSaveSnapshot(legacySnapshot);

    expect(result.ok).toBe(true);
    expect(result.snapshot?.metadata.version).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(
      result.snapshot?.areas.every(
        (area) =>
          area.scene.tiles.length > 0 &&
          area.scene.grid.width >= 12 &&
          area.scene.grid.height >= 8,
      ),
    ).toBe(true);
  });
});
