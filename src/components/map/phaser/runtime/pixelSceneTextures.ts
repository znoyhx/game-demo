import type Phaser from 'phaser';

import type { PixelScenePalette } from '../pixelSceneRenderer.contract';
import {
  getSupportedPixelSceneTileKinds,
  resolvePixelSceneTileArt,
} from './pixelSceneArtPipeline';
import { colorsByPalette, type PaletteColors } from './pixelScenePaletteColors';
import { ensurePixelSceneSpriteSheets } from './pixelSceneSpriteSheets';

const resolveTileColors = (
  palette: PaletteColors,
  kind: ReturnType<typeof getSupportedPixelSceneTileKinds>[number],
) => {
  switch (kind) {
    case 'grass':
      return { fill: palette.ground, accent: palette.accent };
    case 'path':
      return { fill: palette.path, accent: palette.outline };
    case 'stone':
      return { fill: palette.stone, accent: palette.accent };
    case 'wood':
      return { fill: palette.wood, accent: palette.path };
    case 'water':
      return { fill: palette.water, accent: palette.accent };
    case 'foliage':
      return { fill: palette.foliage, accent: palette.accent };
    case 'wall':
      return { fill: palette.wall, accent: palette.stone };
    case 'ember':
      return { fill: palette.ember, accent: palette.path };
    case 'void':
      return { fill: palette.void, accent: palette.wall };
    case 'bridge':
      return { fill: palette.path, accent: palette.wood };
  }
};

const drawTileTexture = (
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  size: number,
  fill: number,
  accent: number,
  outline: number,
) => {
  graphics.clear();
  graphics.fillStyle(fill, 1);
  graphics.fillRect(0, 0, size, size);
  graphics.fillStyle(accent, 0.82);
  graphics.fillRect(2, 2, size - 4, 3);
  graphics.fillRect(3, Math.floor(size / 2), size - 6, 2);
  graphics.fillRect(Math.floor(size / 2) - 1, 4, 2, size - 8);
  graphics.lineStyle(2, outline, 1);
  graphics.strokeRect(0, 0, size, size);
  graphics.generateTexture(key, size, size);
};

export const ensurePixelSceneTextures = (
  scene: Phaser.Scene,
  palette: PixelScenePalette,
  tileSize: number,
) => {
  const paletteColors = colorsByPalette[palette];
  const graphics = scene.add.graphics();
  graphics.setVisible(false);

  for (const kind of getSupportedPixelSceneTileKinds()) {
    const art = resolvePixelSceneTileArt(palette, kind);
    if (scene.textures.exists(art.textureKey) || art.source.kind !== 'generated') {
      continue;
    }

    const resolvedColors = resolveTileColors(paletteColors, kind);
    drawTileTexture(
      graphics,
      art.textureKey,
      tileSize,
      resolvedColors.fill,
      resolvedColors.accent,
      paletteColors.outline,
    );
  }

  graphics.destroy();
  ensurePixelSceneSpriteSheets(scene, palette, tileSize);
};
