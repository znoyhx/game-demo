import { z } from 'zod';

const pixelToneSchema = z.enum([
  'default',
  'success',
  'warning',
  'info',
  'danger',
]);

export const pixelScenePaletteSchema = z.enum([
  'town',
  'shop',
  'wilderness',
  'hidden',
  'ruin',
  'dungeon',
  'boss',
]);

export const pixelSceneTileKindSchema = z.enum([
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
]);

export const pixelSceneTileLayerSchema = z.enum(['ground', 'overlay']);

export const pixelSceneTileSchema = z
  .object({
    id: z.string().min(1),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    kind: pixelSceneTileKindSchema,
    layer: pixelSceneTileLayerSchema,
    blocked: z.boolean(),
  })
  .strict();

export const pixelSceneEntityTypeSchema = z.enum([
  'npc',
  'shop',
  'portal',
  'event',
  'battle',
  'item',
]);

export const pixelSceneEntitySchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    caption: z.string().min(1),
    type: pixelSceneEntityTypeSchema,
    targetId: z.string().min(1).optional(),
    enabled: z.boolean(),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    feedbackTone: pixelToneSchema,
    autoInteractOnApproach: z.boolean(),
    interactionRadius: z.number().min(0.6).max(2.5),
  })
  .strict();

export const pixelSceneViewportSchema = z
  .object({
    tileSize: z.number().int().min(16).max(64),
    widthTiles: z.number().int().min(12).max(64),
    heightTiles: z.number().int().min(8).max(64),
    cameraZoom: z.number().min(1).max(6),
  })
  .strict();

export const pixelScenePromptCopySchema = z
  .object({
    moveHint: z.string().min(1),
    interactHint: z.string().min(1),
    portalHint: z.string().min(1),
    combatHint: z.string().min(1),
    itemHint: z.string().min(1),
    eventHint: z.string().min(1),
    lockedHint: z.string().min(1),
    proximityHint: z.string().min(1),
  })
  .strict();

export const pixelSceneSummarySchema = z
  .object({
    blockedTileCount: z.number().int().min(0),
    portalCount: z.number().int().min(0),
    npcCount: z.number().int().min(0),
    interactionCount: z.number().int().min(0),
  })
  .strict();

export const pixelSceneRenderModelSchema = z
  .object({
    renderer: z.literal('phaser'),
    areaId: z.string().min(1),
    areaName: z.string().min(1),
    areaTypeLabel: z.string().min(1),
    palette: pixelScenePaletteSchema,
    viewport: pixelSceneViewportSchema,
    playerSpawn: z
      .object({
        x: z.number().int().min(0),
        y: z.number().int().min(0),
      })
      .strict(),
    tiles: z.array(pixelSceneTileSchema).min(1),
    entities: z.array(pixelSceneEntitySchema),
    prompts: pixelScenePromptCopySchema,
    summary: pixelSceneSummarySchema,
  })
  .strict();

export type PixelScenePalette = z.infer<typeof pixelScenePaletteSchema>;
export type PixelSceneTileKind = z.infer<typeof pixelSceneTileKindSchema>;
export type PixelSceneTileLayer = z.infer<typeof pixelSceneTileLayerSchema>;
export type PixelSceneTile = z.infer<typeof pixelSceneTileSchema>;
export type PixelSceneEntityType = z.infer<typeof pixelSceneEntityTypeSchema>;
export type PixelSceneEntity = z.infer<typeof pixelSceneEntitySchema>;
export type PixelSceneViewport = z.infer<typeof pixelSceneViewportSchema>;
export type PixelScenePromptCopy = z.infer<typeof pixelScenePromptCopySchema>;
export type PixelSceneSummary = z.infer<typeof pixelSceneSummarySchema>;
export type PixelSceneRenderModel = z.infer<typeof pixelSceneRenderModelSchema>;
