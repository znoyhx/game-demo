import { describe, expect, it } from 'vitest';

import {
  generatedSpriteSheets,
  getGeneratedSpriteValidTokens,
} from '../../src/assets/pixel-scene/generatedSpriteSheets';

describe('generated pixel sprite sheets', () => {
  it('keeps every frame rectangular and token-safe', () => {
    const validTokens = getGeneratedSpriteValidTokens();

    Object.values(generatedSpriteSheets).forEach((definition) => {
      definition.frames.forEach((frame) => {
        expect(frame.pixels).toHaveLength(definition.frameHeight);
        frame.pixels.forEach((row) => {
          expect(row).toHaveLength(definition.frameWidth);
          row.split('').forEach((token) => {
            expect(validTokens.has(token as never)).toBe(true);
          });
        });
      });
    });
  });

  it('references only declared frame keys from animations', () => {
    Object.values(generatedSpriteSheets).forEach((definition) => {
      const frameKeys = new Set(definition.frames.map((frame) => frame.key));

      definition.animations.forEach((animation) => {
        animation.frames.forEach((frameKey) => {
          expect(frameKeys.has(frameKey)).toBe(true);
        });
      });
    });
  });

  it('ships the expected animation families for the in-world renderer', () => {
    expect(generatedSpriteSheets.humanoid.animations.map((entry) => entry.key)).toEqual(
      expect.arrayContaining([
        'idle-down',
        'walk-down',
        'idle-side',
        'walk-side',
        'idle-up',
        'walk-up',
      ]),
    );
    expect(generatedSpriteSheets.portal.defaultAnimation).toBe('pulse');
    expect(generatedSpriteSheets.event.defaultAnimation).toBe('pulse');
    expect(generatedSpriteSheets.battle.defaultAnimation).toBe('alarm');
    expect(generatedSpriteSheets.item.defaultAnimation).toBe('idle');
  });
});
