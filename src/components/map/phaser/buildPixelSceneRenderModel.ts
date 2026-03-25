import type { Area } from '../../../core/schemas';
import { buildDefaultAreaSceneDefinition } from '../../../core/utils/areaSceneDefinition';
import type { AreaSceneMarker } from '../areaSceneStage.contract';
import {
  pixelSceneRenderModelSchema,
  type PixelSceneEntity,
  type PixelScenePalette,
  type PixelSceneRenderModel,
  type PixelSceneTile,
} from './pixelSceneRenderer.contract';

const viewportDefaults = {
  tileSize: 24,
  cameraZoom: 2.2,
} as const;

const fallbackArea = {
  id: 'area:fallback-stage',
  name: '像素场景装配台',
  typeLabel: '调试场景',
  palette: 'town' as PixelScenePalette,
};

const prompts = {
  moveHint: '方向键移动',
  interactHint: '空格与当前目标交互',
  portalHint: '踏入传送点会切换区域',
  combatHint: '接近战斗节点后可立即进入遭遇战',
  itemHint: '靠近可点击的资源点后按空格交互',
  eventHint: '事件节点会把世界变化写回现有系统',
  lockedHint: '当前正处于对话或战斗流程，场景移动暂时锁定',
  proximityHint: '靠近角色会自动接入既有对话流程',
};

const areaPaletteByType: Record<Area['type'], PixelScenePalette> = {
  town: 'town',
  shop: 'shop',
  wilderness: 'wilderness',
  hidden: 'hidden',
  ruin: 'ruin',
  dungeon: 'dungeon',
  boss: 'boss',
};

const fallbackScene = buildDefaultAreaSceneDefinition({
  id: fallbackArea.id,
  type: 'town',
  npcIds: [],
  interactionPoints: [],
});

const sortTiles = (tiles: PixelSceneTile[]) =>
  [...tiles].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer === 'ground' ? -1 : 1;
    }

    if (left.y !== right.y) {
      return left.y - right.y;
    }

    return left.x - right.x;
  });

const toPixelTiles = (area: Area | null) => {
  const scene = area?.scene ?? fallbackScene;
  return sortTiles([
    ...scene.tiles.map((tile) => ({
      id: tile.id,
      x: tile.x,
      y: tile.y,
      kind: tile.kind,
      layer: tile.layer,
      blocked: tile.blocked,
    })),
    ...scene.decorativeLayers.flatMap((layer) =>
      layer.tiles.map((tile) => ({
        id: tile.id,
        x: tile.x,
        y: tile.y,
        kind: tile.kind,
        layer: tile.layer,
        blocked: false,
      })),
    ),
  ]);
};

const buildFallbackRenderModel = () => {
  const tileList = toPixelTiles(null);

  return pixelSceneRenderModelSchema.parse({
    renderer: 'phaser',
    areaId: fallbackArea.id,
    areaName: fallbackArea.name,
    areaTypeLabel: fallbackArea.typeLabel,
    palette: fallbackArea.palette,
    viewport: {
      tileSize: viewportDefaults.tileSize,
      widthTiles: fallbackScene.grid.width,
      heightTiles: fallbackScene.grid.height,
      cameraZoom: viewportDefaults.cameraZoom,
    },
    playerSpawn: fallbackScene.playerSpawn,
    tiles: tileList,
    entities: [],
    prompts,
    summary: {
      blockedTileCount: tileList.filter((tile) => tile.blocked).length,
      portalCount: 0,
      npcCount: 0,
      interactionCount: 0,
    },
  });
};

const defaultCaptionByType: Record<PixelSceneEntity['type'], string> = {
  npc: '对话 / 信任',
  shop: '交易通道',
  portal: '区域路线',
  event: '世界事件',
  battle: '进入战斗',
  item: '可收集物',
};

const defaultToneByType: Record<
  PixelSceneEntity['type'],
  PixelSceneEntity['feedbackTone']
> = {
  npc: 'success',
  shop: 'success',
  portal: 'info',
  event: 'info',
  battle: 'warning',
  item: 'default',
};

const buildPixelEntity = (input: {
  id: string;
  type: PixelSceneEntity['type'];
  label: string;
  caption?: string;
  targetId?: string;
  enabled?: boolean;
  x: number;
  y: number;
  feedbackTone?: PixelSceneEntity['feedbackTone'];
}): PixelSceneEntity => ({
  id: input.id,
  label: input.label,
  caption: input.caption ?? defaultCaptionByType[input.type],
  type: input.type,
  targetId: input.targetId,
  enabled: input.enabled ?? true,
  x: input.x,
  y: input.y,
  feedbackTone: input.feedbackTone ?? defaultToneByType[input.type],
  autoInteractOnApproach:
    input.type === 'npc' ||
    input.type === 'shop' ||
    input.type === 'portal' ||
    input.type === 'event',
  interactionRadius:
    input.type === 'npc' || input.type === 'shop'
      ? 1.15
      : input.type === 'portal'
        ? 0.85
        : 0.95,
});

const toGridCoordinateFromPercent = (percent: number, size: number) => {
  const maxIndex = Math.max(0, size - 1);
  return Math.min(
    maxIndex,
    Math.max(0, Math.round((percent / 100) * maxIndex)),
  );
};

const buildEntities = (area: Area, markers: AreaSceneMarker[]) => {
  const scene = area.scene ?? buildDefaultAreaSceneDefinition(area);
  const interactionPointById = new Map(
    area.interactionPoints.map((point) => [point.id, point]),
  );
  const markerById = new Map(markers.map((marker) => [marker.id, marker]));
  const markerByTargetId = new Map(
    markers
      .filter((marker) => marker.targetId)
      .map((marker) => [marker.targetId!, marker]),
  );

  const npcEntities = scene.npcSpawns.flatMap((spawn) => {
    const marker = markerByTargetId.get(spawn.npcId);
    const interactionPoint = area.interactionPoints.find(
      (point) =>
        (point.type === 'npc' || point.type === 'shop') &&
        point.targetId === spawn.npcId,
    );

    if (!marker && !interactionPoint) {
      return [];
    }

    const type =
      marker?.type ?? (interactionPoint?.type === 'shop' ? 'shop' : 'npc');

    return [
      buildPixelEntity({
        id: marker?.id ?? `entity:${type}:${spawn.npcId}`,
        type,
        label: marker?.label ?? interactionPoint?.label ?? spawn.npcId,
        caption: marker?.caption,
        targetId: spawn.npcId,
        enabled: marker?.enabled ?? interactionPoint?.enabled ?? true,
        x: spawn.x,
        y: spawn.y,
        feedbackTone: marker?.feedbackTone,
      }),
    ];
  });

  const interactionEntities = scene.interactionSpawns.map((spawn) => {
    const marker = markerById.get(spawn.interactionId);
    const interactionPoint = interactionPointById.get(spawn.interactionId);
    const type =
      marker?.type ??
      (interactionPoint?.type === 'item' ||
      interactionPoint?.type === 'event' ||
      interactionPoint?.type === 'battle'
        ? interactionPoint.type
        : 'item');

    return buildPixelEntity({
      id: spawn.interactionId,
      type,
      label: marker?.label ?? interactionPoint?.label ?? spawn.interactionId,
      caption: marker?.caption,
      targetId: marker?.targetId ?? interactionPoint?.targetId,
      enabled: marker?.enabled ?? interactionPoint?.enabled ?? true,
      x: spawn.x,
      y: spawn.y,
      feedbackTone: marker?.feedbackTone,
    });
  });

  const portalEntities = scene.portalSpawns.map((spawn) => {
    const marker = markerById.get(spawn.interactionId);
    const interactionPoint = interactionPointById.get(spawn.interactionId);

    return buildPixelEntity({
      id: spawn.interactionId,
      type: 'portal',
      label: marker?.label ?? interactionPoint?.label ?? spawn.interactionId,
      caption: marker?.caption,
      targetId: spawn.targetAreaId,
      enabled: marker?.enabled ?? interactionPoint?.enabled ?? true,
      x: spawn.x,
      y: spawn.y,
      feedbackTone: marker?.feedbackTone,
    });
  });

  const existingEntityIds = new Set(
    [...npcEntities, ...interactionEntities, ...portalEntities].map(
      (entity) => entity.id,
    ),
  );

  const dynamicMarkerEntities = markers
    .filter((marker) => !existingEntityIds.has(marker.id))
    .map((marker) =>
      buildPixelEntity({
        id: marker.id,
        type: marker.type,
        label: marker.label,
        caption: marker.caption,
        targetId: marker.targetId,
        enabled: marker.enabled,
        x:
          marker.mapX ??
          toGridCoordinateFromPercent(marker.xPercent, scene.grid.width),
        y:
          marker.mapY ??
          toGridCoordinateFromPercent(marker.yPercent, scene.grid.height),
        feedbackTone: marker.feedbackTone,
      }),
    );

  return [
    ...npcEntities,
    ...interactionEntities,
    ...portalEntities,
    ...dynamicMarkerEntities,
  ];
};

export function buildPixelSceneRenderModel(input: {
  area: Area | null;
  areaTypeLabel: string;
  markers: AreaSceneMarker[];
}): PixelSceneRenderModel {
  if (!input.area) {
    return buildFallbackRenderModel();
  }

  const scene = input.area.scene ?? buildDefaultAreaSceneDefinition(input.area);
  const palette = areaPaletteByType[input.area.type];
  const tiles = toPixelTiles(input.area);
  const entities = buildEntities(input.area, input.markers);

  return pixelSceneRenderModelSchema.parse({
    renderer: 'phaser',
    areaId: input.area.id,
    areaName: input.area.name,
    areaTypeLabel: input.areaTypeLabel,
    palette,
    viewport: {
      tileSize: viewportDefaults.tileSize,
      widthTiles: scene.grid.width,
      heightTiles: scene.grid.height,
      cameraZoom: viewportDefaults.cameraZoom,
    },
    playerSpawn: scene.playerSpawn,
    tiles,
    entities,
    prompts,
    summary: {
      blockedTileCount: tiles.filter((tile) => tile.blocked).length,
      portalCount: entities.filter((entity) => entity.type === 'portal').length,
      npcCount: entities.filter(
        (entity) => entity.type === 'npc' || entity.type === 'shop',
      ).length,
      interactionCount: entities.length,
    },
  });
}
