import { z } from 'zod';

import {
  areaIdSchema,
  genericIdSchema,
  nonEmptyStringSchema,
  npcIdSchema,
} from './shared';

export const areaSceneTileKindSchema = z.enum([
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

export const areaSceneTileLayerSchema = z.enum(['ground', 'overlay']);

export const areaSceneTravelModeSchema = z.enum(['walk', 'teleport']);

const gridCoordinateSchema = z.number().int().min(0).max(127);

export const areaSceneGridSchema = z
  .object({
    width: z.number().int().min(12).max(64),
    height: z.number().int().min(8).max(64),
  })
  .strict();

export const areaScenePositionSchema = z
  .object({
    x: gridCoordinateSchema,
    y: gridCoordinateSchema,
  })
  .strict();

export const areaSceneTileSchema = areaScenePositionSchema
  .extend({
    id: genericIdSchema,
    kind: areaSceneTileKindSchema,
    layer: areaSceneTileLayerSchema,
    blocked: z.boolean(),
  })
  .strict();

export const areaSceneDecorationLayerSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    layer: areaSceneTileLayerSchema,
    tiles: z.array(areaSceneTileSchema),
  })
  .strict();

export const areaSceneNpcSpawnSchema = areaScenePositionSchema
  .extend({
    npcId: npcIdSchema,
  })
  .strict();

export const areaSceneInteractionSpawnSchema = areaScenePositionSchema
  .extend({
    interactionId: genericIdSchema,
  })
  .strict();

export const areaScenePortalSpawnSchema = areaScenePositionSchema
  .extend({
    interactionId: genericIdSchema,
    targetAreaId: areaIdSchema,
    travelMode: areaSceneTravelModeSchema,
  })
  .strict();

const pushOutOfBoundsIssue = (
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  width: number,
  height: number,
  x: number,
  y: number,
) => {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message: `scene position (${x}, ${y}) exceeds grid ${width}x${height}`,
  });
};

export const areaSceneDefinitionSchema = z
  .object({
    grid: areaSceneGridSchema,
    playerSpawn: areaScenePositionSchema,
    tiles: z.array(areaSceneTileSchema).min(1),
    decorativeLayers: z.array(areaSceneDecorationLayerSchema).default([]),
    npcSpawns: z.array(areaSceneNpcSpawnSchema),
    interactionSpawns: z.array(areaSceneInteractionSpawnSchema),
    portalSpawns: z.array(areaScenePortalSpawnSchema),
  })
  .strict()
  .superRefine((scene, ctx) => {
    const {
      grid: { width, height },
    } = scene;

    const assertInGrid = (
      path: Array<string | number>,
      position: { x: number; y: number },
    ) => {
      if (
        position.x < 0 ||
        position.x >= width ||
        position.y < 0 ||
        position.y >= height
      ) {
        pushOutOfBoundsIssue(
          ctx,
          path,
          width,
          height,
          position.x,
          position.y,
        );
      }
    };

    assertInGrid(['playerSpawn'], scene.playerSpawn);

    const tileIds = new Set<string>();
    const assertUniqueId = (id: string, path: Array<string | number>) => {
      if (tileIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `duplicate scene tile id "${id}"`,
        });
        return;
      }
      tileIds.add(id);
    };

    scene.tiles.forEach((tile, index) => {
      assertInGrid(['tiles', index], tile);
      assertUniqueId(tile.id, ['tiles', index, 'id']);
    });

    scene.decorativeLayers.forEach((layer, layerIndex) => {
      layer.tiles.forEach((tile, tileIndex) => {
        assertInGrid(
          ['decorativeLayers', layerIndex, 'tiles', tileIndex],
          tile,
        );

        if (tile.blocked) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['decorativeLayers', layerIndex, 'tiles', tileIndex, 'blocked'],
            message: 'decorative layer tiles cannot block movement',
          });
        }
      });
    });

    scene.npcSpawns.forEach((spawn, index) => {
      assertInGrid(['npcSpawns', index], spawn);
    });

    scene.interactionSpawns.forEach((spawn, index) => {
      assertInGrid(['interactionSpawns', index], spawn);
    });

    scene.portalSpawns.forEach((spawn, index) => {
      assertInGrid(['portalSpawns', index], spawn);
    });
  });

export type AreaSceneTileKind = z.infer<typeof areaSceneTileKindSchema>;
export type AreaSceneTileLayer = z.infer<typeof areaSceneTileLayerSchema>;
export type AreaSceneTravelMode = z.infer<typeof areaSceneTravelModeSchema>;
export type AreaSceneGrid = z.infer<typeof areaSceneGridSchema>;
export type AreaScenePosition = z.infer<typeof areaScenePositionSchema>;
export type AreaSceneTile = z.infer<typeof areaSceneTileSchema>;
export type AreaSceneDecorationLayer = z.infer<
  typeof areaSceneDecorationLayerSchema
>;
export type AreaSceneNpcSpawn = z.infer<typeof areaSceneNpcSpawnSchema>;
export type AreaSceneInteractionSpawn = z.infer<
  typeof areaSceneInteractionSpawnSchema
>;
export type AreaScenePortalSpawn = z.infer<typeof areaScenePortalSpawnSchema>;
export type AreaSceneDefinition = z.infer<typeof areaSceneDefinitionSchema>;
