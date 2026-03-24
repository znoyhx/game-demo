import type Phaser from 'phaser';

import {
  getGeneratedSpriteSheetDefinition,
  type GeneratedSpriteAnimationDefinition,
  type GeneratedSpriteFrameDefinition,
  type GeneratedSpriteToken,
} from '../../../../assets/pixel-scene/generatedSpriteSheets';
import type { PixelScenePalette } from '../pixelSceneRenderer.contract';
import {
  getEntityAnimationKey,
  getSupportedPixelSceneEntityKinds,
  resolvePixelSceneEntityArt,
} from './pixelSceneArtPipeline';
import { colorsByPalette } from './pixelScenePaletteColors';

type EntityKind = ReturnType<typeof getSupportedPixelSceneEntityKinds>[number];
type TokenColorMap = Record<Exclude<GeneratedSpriteToken, '.'>, number>;

const mixHex = (left: number, right: number, ratio: number) => {
  const normalized = Math.max(0, Math.min(1, ratio));
  const leftRed = (left >> 16) & 0xff;
  const leftGreen = (left >> 8) & 0xff;
  const leftBlue = left & 0xff;
  const rightRed = (right >> 16) & 0xff;
  const rightGreen = (right >> 8) & 0xff;
  const rightBlue = right & 0xff;

  const red = Math.round(leftRed + (rightRed - leftRed) * normalized);
  const green = Math.round(leftGreen + (rightGreen - leftGreen) * normalized);
  const blue = Math.round(leftBlue + (rightBlue - leftBlue) * normalized);

  return (red << 16) | (green << 8) | blue;
};

const resolvePrimaryColor = (palette: PixelScenePalette, type: EntityKind) => {
  const colors = colorsByPalette[palette];

  switch (type) {
    case 'npc':
      return colors.npc;
    case 'shop':
      return colors.shop;
    case 'portal':
      return colors.portal;
    case 'event':
      return colors.event;
    case 'battle':
      return colors.battle;
    case 'item':
      return colors.item;
    case 'player':
    default:
      return colors.player;
  }
};

const resolveSecondaryColor = (palette: PixelScenePalette, type: EntityKind) => {
  const colors = colorsByPalette[palette];

  switch (type) {
    case 'battle':
      return mixHex(colors.ember, colors.event, 0.35);
    case 'portal':
      return mixHex(colors.portal, 0xffffff, 0.4);
    case 'item':
      return mixHex(colors.item, colors.wood, 0.5);
    case 'player':
      return colors.playerAccent;
    default:
      return mixHex(resolvePrimaryColor(palette, type), colors.accent, 0.4);
  }
};

const resolveAccentColor = (palette: PixelScenePalette, type: EntityKind) => {
  const colors = colorsByPalette[palette];

  switch (type) {
    case 'portal':
      return mixHex(colors.portal, 0xffffff, 0.55);
    case 'event':
      return mixHex(colors.event, 0xffffff, 0.34);
    case 'battle':
      return colors.ember;
    case 'item':
      return colors.path;
    case 'player':
      return mixHex(colors.playerAccent, colors.accent, 0.32);
    default:
      return colors.accent;
  }
};

const buildTokenColorMap = (
  palette: PixelScenePalette,
  type: EntityKind,
): TokenColorMap => {
  const colors = colorsByPalette[palette];
  const primary = resolvePrimaryColor(palette, type);
  const secondary = resolveSecondaryColor(palette, type);
  const accent = resolveAccentColor(palette, type);

  return {
    o: colors.outline,
    p: primary,
    s: secondary,
    a: accent,
    d: mixHex(primary, colors.outline, 0.45),
    h: mixHex(secondary, 0xffffff, 0.38),
    g: mixHex(accent, 0xffffff, 0.5),
  };
};

const drawFrame = (
  context: CanvasRenderingContext2D,
  frame: GeneratedSpriteFrameDefinition,
  definitionFrameWidth: number,
  definitionFrameHeight: number,
  outputSize: number,
  colors: TokenColorMap,
  frameOffsetX: number,
) => {
  const pixelScale = Math.max(
    1,
    Math.floor(
      Math.min(outputSize / definitionFrameWidth, outputSize / definitionFrameHeight),
    ),
  );
  const contentWidth = definitionFrameWidth * pixelScale;
  const contentHeight = definitionFrameHeight * pixelScale;
  const paddingX = Math.floor((outputSize - contentWidth) / 2);
  const paddingY = Math.floor((outputSize - contentHeight) / 2);

  frame.pixels.forEach((row, rowIndex) => {
    row.split('').forEach((token, columnIndex) => {
      if (token === '.') {
        return;
      }

      context.fillStyle = `#${colors[token as keyof TokenColorMap]
        .toString(16)
        .padStart(6, '0')}`;
      context.fillRect(
        frameOffsetX + paddingX + columnIndex * pixelScale,
        paddingY + rowIndex * pixelScale,
        pixelScale,
        pixelScale,
      );
    });
  });
};

const createSpriteSheetTexture = (
  scene: Phaser.Scene,
  textureKey: string,
  frameSize: number,
  frameDefinitions: readonly GeneratedSpriteFrameDefinition[],
  colors: TokenColorMap,
) => {
  const ownerDocument =
    scene.sys.game.canvas?.ownerDocument ??
    (typeof document !== 'undefined' ? document : undefined);

  if (!ownerDocument) {
    return;
  }

  const canvas = ownerDocument.createElement('canvas');
  canvas.width = frameSize * frameDefinitions.length;
  canvas.height = frameSize;

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);

  frameDefinitions.forEach((frame, index) => {
    drawFrame(
      context,
      frame,
      frame.pixels[0]?.length ?? frameSize,
      frame.pixels.length,
      frameSize,
      colors,
      index * frameSize,
    );
  });

  registerGeneratedSpriteSheetTexture(
    scene.textures,
    textureKey,
    canvas as unknown as HTMLImageElement,
    frameSize,
    frameDefinitions.length,
  );
};

interface SpriteSheetRegistrar {
  addSpriteSheet: (
    key: string,
    source: HTMLImageElement,
    config: {
      frameWidth: number;
      frameHeight: number;
      endFrame: number;
    },
  ) => unknown;
}

export const registerGeneratedSpriteSheetTexture = (
  textures: SpriteSheetRegistrar,
  textureKey: string,
  canvasSource: HTMLImageElement,
  frameSize: number,
  frameCount: number,
) =>
  textures.addSpriteSheet(textureKey, canvasSource, {
    frameWidth: frameSize,
    frameHeight: frameSize,
    endFrame: frameCount - 1,
  });

const ensureAnimation = (
  scene: Phaser.Scene,
  animationKey: string,
  textureKey: string,
  frameIndexByKey: Map<string, number>,
  animation: GeneratedSpriteAnimationDefinition,
) => {
  if (scene.anims.exists(animationKey)) {
    return;
  }

  scene.anims.create({
    key: animationKey,
    frames: animation.frames
      .map((frameKey) => frameIndexByKey.get(frameKey))
      .filter((frameIndex): frameIndex is number => frameIndex !== undefined)
      .map((frame) => ({ key: textureKey, frame })),
    frameRate: animation.frameRate,
    repeat: animation.repeat,
  });
};

export const ensurePixelSceneSpriteSheets = (
  scene: Phaser.Scene,
  palette: PixelScenePalette,
  tileSize: number,
) => {
  for (const kind of getSupportedPixelSceneEntityKinds()) {
    const art = resolvePixelSceneEntityArt(palette, kind);
    if (art.source.kind !== 'generated') {
      continue;
    }

    const definition = getGeneratedSpriteSheetDefinition(art.animationFamily);
    const frameIndexByKey = new Map(
      definition.frames.map((frame, index) => [frame.key, index]),
    );

    if (!scene.textures.exists(art.textureKey)) {
      createSpriteSheetTexture(
        scene,
        art.textureKey,
        tileSize,
        definition.frames,
        buildTokenColorMap(palette, kind),
      );
    }

    definition.animations.forEach((animation) => {
      ensureAnimation(
        scene,
        getEntityAnimationKey(palette, kind, animation.key),
        art.textureKey,
        frameIndexByKey,
        animation,
      );
    });
  }
};
