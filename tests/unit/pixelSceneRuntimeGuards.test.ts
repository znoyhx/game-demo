import { describe, expect, it, vi } from 'vitest';

import { centerPixelSceneCameraSafely } from '../../src/components/map/phaser/runtime/pixelSceneRuntimeGuards';

describe('pixel scene runtime guards', () => {
  it('does not throw when camera is not ready yet', () => {
    expect(centerPixelSceneCameraSafely(undefined, 12, 24)).toBe(false);
    expect(centerPixelSceneCameraSafely(null, 12, 24)).toBe(false);
  });

  it('centers the camera when a valid camera exists', () => {
    const centerOn = vi.fn();

    expect(centerPixelSceneCameraSafely({ centerOn }, 18, 36)).toBe(true);
    expect(centerOn).toHaveBeenCalledWith(18, 36);
  });
});
