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
});
