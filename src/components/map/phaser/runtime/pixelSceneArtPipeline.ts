import type {
  PixelSceneEntityType,
  PixelScenePalette,
  PixelSceneRenderModel,
  PixelSceneTileKind,
} from '../pixelSceneRenderer.contract';
import type {
  GeneratedSpriteAnimationKey,
  GeneratedSpriteFamily,
} from '../../../../assets/pixel-scene/generatedSpriteSheets';

export type PixelSceneMotionPreset =
  | 'still'
  | 'npcIdle'
  | 'playerWalk'
  | 'portalPulse'
  | 'eventPulse'
  | 'battleAlarm'
  | 'waterShimmer'
  | 'emberFlicker'
  | 'foliageDrift';

export type PixelSceneTextureSource =
  | {
      kind: 'generated';
      designId: string;
    }
  | {
      kind: 'atlas';
      atlasKey: string;
      frame: string;
    };

export interface PixelSceneTileArtSpec {
  textureKey: string;
  palette: PixelScenePalette;
  kind: PixelSceneTileKind;
  source: PixelSceneTextureSource;
  motionPreset: PixelSceneMotionPreset;
  detailPreset: 'flat' | 'path' | 'ripple' | 'foliage' | 'wall' | 'ember';
}

export interface PixelSceneEntityArtSpec {
  textureKey: string;
  palette: PixelScenePalette;
  type: PixelSceneEntityType | 'player';
  source: PixelSceneTextureSource;
  motionPreset: PixelSceneMotionPreset;
  animationFamily: GeneratedSpriteFamily;
  defaultAnimation: GeneratedSpriteAnimationKey;
  silhouette: 'humanoid' | 'portal' | 'diamond' | 'crest' | 'crate';
  baseScale: number;
  focusScale: number;
}

export interface PixelSceneAmbientDescriptor {
  id: string;
  x: number;
  y: number;
  depth: number;
  motionPreset: PixelSceneMotionPreset;
  tone: 'success' | 'warning' | 'info' | 'default';
  radius: number;
  anchor: 'tile' | 'entity';
}

const tileKinds: PixelSceneTileKind[] = [
  'grass',
  'path',
  'stone',
  'wood',
  'water',
  'foliage',
  'wall',
  'ember',
  'void',
  'bridge',
];

const entityKinds: Array<PixelSceneEntityType | 'player'> = [
  'npc',
  'shop',
  'portal',
  'event',
  'battle',
  'item',
  'player',
];

export const getTileTextureKey = (
  palette: PixelScenePalette,
  kind: PixelSceneTileKind,
) => `pixelforge:${palette}:tile:${kind}`;

export const getEntityTextureKey = (
  palette: PixelScenePalette,
  type: PixelSceneEntityType | 'player',
) => `pixelforge:${palette}:entity:${type}`;

export const getEntityAnimationKey = (
  palette: PixelScenePalette,
  type: PixelSceneEntityType | 'player',
  animation: GeneratedSpriteAnimationKey,
) => `pixelforge:${palette}:animation:${type}:${animation}`;

export const getSupportedPixelSceneTileKinds = () => tileKinds;

export const getSupportedPixelSceneEntityKinds = () => entityKinds;

const tileMotionPresetByKind: Record<PixelSceneTileKind, PixelSceneMotionPreset> = {
  grass: 'still',
  path: 'still',
  stone: 'still',
  wood: 'still',
  water: 'waterShimmer',
  foliage: 'foliageDrift',
  wall: 'still',
  ember: 'emberFlicker',
  void: 'still',
  bridge: 'still',
};

const tileDetailPresetByKind: Record<PixelSceneTileKind, PixelSceneTileArtSpec['detailPreset']> = {
  grass: 'flat',
  path: 'path',
  stone: 'flat',
  wood: 'path',
  water: 'ripple',
  foliage: 'foliage',
  wall: 'wall',
  ember: 'ember',
  void: 'wall',
  bridge: 'path',
};

const entityMotionPresetByType: Record<
  PixelSceneEntityType | 'player',
  PixelSceneMotionPreset
> = {
  npc: 'npcIdle',
  shop: 'npcIdle',
  portal: 'portalPulse',
  event: 'eventPulse',
  battle: 'battleAlarm',
  item: 'still',
  player: 'playerWalk',
};

const entityAnimationFamilyByType: Record<
  PixelSceneEntityType | 'player',
  GeneratedSpriteFamily
> = {
  npc: 'humanoid',
  shop: 'humanoid',
  portal: 'portal',
  event: 'event',
  battle: 'battle',
  item: 'item',
  player: 'humanoid',
};

const entityDefaultAnimationByType: Record<
  PixelSceneEntityType | 'player',
  GeneratedSpriteAnimationKey
> = {
  npc: 'idle-down',
  shop: 'idle-down',
  portal: 'pulse',
  event: 'pulse',
  battle: 'alarm',
  item: 'idle',
  player: 'idle-down',
};

const entitySilhouetteByType: Record<
  PixelSceneEntityType | 'player',
  PixelSceneEntityArtSpec['silhouette']
> = {
  npc: 'humanoid',
  shop: 'humanoid',
  portal: 'portal',
  event: 'diamond',
  battle: 'crest',
  item: 'crate',
  player: 'humanoid',
};

const entityScaleByType: Record<
  PixelSceneEntityType | 'player',
  Pick<PixelSceneEntityArtSpec, 'baseScale' | 'focusScale'>
> = {
  npc: { baseScale: 0.95, focusScale: 1.08 },
  shop: { baseScale: 0.95, focusScale: 1.08 },
  portal: { baseScale: 1.05, focusScale: 1.12 },
  event: { baseScale: 1, focusScale: 1.08 },
  battle: { baseScale: 1, focusScale: 1.08 },
  item: { baseScale: 0.94, focusScale: 1.02 },
  player: { baseScale: 1, focusScale: 1.05 },
};

export const resolvePixelSceneTileArt = (
  palette: PixelScenePalette,
  kind: PixelSceneTileKind,
): PixelSceneTileArtSpec => ({
  textureKey: getTileTextureKey(palette, kind),
  palette,
  kind,
  source: {
    kind: 'generated',
    designId: `generated-tile:${kind}`,
  },
  motionPreset: tileMotionPresetByKind[kind],
  detailPreset: tileDetailPresetByKind[kind],
});

export const resolvePixelSceneEntityArt = (
  palette: PixelScenePalette,
  type: PixelSceneEntityType | 'player',
): PixelSceneEntityArtSpec => ({
  textureKey: getEntityTextureKey(palette, type),
  palette,
  type,
  source: {
    kind: 'generated',
    designId: `generated-entity:${type}`,
  },
  motionPreset: entityMotionPresetByType[type],
  animationFamily: entityAnimationFamilyByType[type],
  defaultAnimation: entityDefaultAnimationByType[type],
  silhouette: entitySilhouetteByType[type],
  ...entityScaleByType[type],
});

export type PixelSceneHumanoidFacing = 'down' | 'side' | 'up';

export const resolveHumanoidAnimationName = (
  moving: boolean,
  facing: PixelSceneHumanoidFacing,
): GeneratedSpriteAnimationKey => {
  switch (facing) {
    case 'side':
      return moving ? 'walk-side' : 'idle-side';
    case 'up':
      return moving ? 'walk-up' : 'idle-up';
    case 'down':
    default:
      return moving ? 'walk-down' : 'idle-down';
  }
};

export const buildPixelSceneAmbientDescriptors = (
  model: PixelSceneRenderModel,
): PixelSceneAmbientDescriptor[] => {
  const tileDescriptors = model.tiles.flatMap((tile) => {
    const art = resolvePixelSceneTileArt(model.palette, tile.kind);

    if (art.motionPreset === 'still') {
      return [];
    }

    if (
      art.motionPreset === 'foliageDrift' &&
      (tile.x + tile.y) % 4 !== 0
    ) {
      return [];
    }

    if (
      art.motionPreset === 'waterShimmer' &&
      tile.layer === 'overlay' &&
      (tile.x + tile.y) % 2 !== 0
    ) {
      return [];
    }

    const tone: PixelSceneAmbientDescriptor['tone'] =
      art.motionPreset === 'emberFlicker'
        ? 'warning'
        : art.motionPreset === 'foliageDrift'
          ? 'success'
          : 'info';

    return [
      {
        id: `fx:tile:${tile.id}`,
        x: tile.x + 0.5,
        y: tile.y + 0.5,
        depth: tile.layer === 'ground' ? tile.y + 0.4 : tile.y * 20 + 2,
        motionPreset: art.motionPreset,
        tone,
        radius:
          art.motionPreset === 'emberFlicker'
            ? 0.34
            : art.motionPreset === 'waterShimmer'
              ? 0.4
              : 0.26,
        anchor: 'tile' as const,
      },
    ];
  });

  const entityDescriptors = model.entities.flatMap((entity) => {
    const art = resolvePixelSceneEntityArt(model.palette, entity.type);

    if (
      art.motionPreset !== 'portalPulse' &&
      art.motionPreset !== 'eventPulse' &&
      art.motionPreset !== 'battleAlarm'
    ) {
      return [];
    }

    const tone: PixelSceneAmbientDescriptor['tone'] =
      art.motionPreset === 'battleAlarm' || art.motionPreset === 'eventPulse'
        ? 'warning'
        : 'info';

    return [
      {
        id: `fx:entity:${entity.id}`,
        x: entity.x + 0.5,
        y: entity.y + 0.5,
        depth: entity.y * 20 + 9,
        motionPreset: art.motionPreset,
        tone,
        radius:
          art.motionPreset === 'battleAlarm'
            ? 0.52
            : art.motionPreset === 'portalPulse'
              ? 0.58
              : 0.46,
        anchor: 'entity' as const,
      },
    ];
  });

  return [...tileDescriptors, ...entityDescriptors];
};
