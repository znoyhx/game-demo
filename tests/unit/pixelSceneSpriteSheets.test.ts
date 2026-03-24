import { describe, expect, it, vi } from 'vitest';

import { registerGeneratedSpriteSheetTexture } from '../../src/components/map/phaser/runtime/pixelSceneSpriteSheets';

describe('pixel scene sprite sheet registration', () => {
  it('registers generated sheets on the final texture key instead of an intermediate cache key', () => {
    const addSpriteSheet = vi.fn();
    const fakeCanvas = {} as HTMLImageElement;

    registerGeneratedSpriteSheetTexture(
      { addSpriteSheet },
      'pixelforge:ruin:entity:player',
      fakeCanvas,
      24,
      12,
    );

    expect(addSpriteSheet).toHaveBeenCalledWith(
      'pixelforge:ruin:entity:player',
      fakeCanvas,
      {
        frameWidth: 24,
        frameHeight: 24,
        endFrame: 11,
      },
    );
  });
});
