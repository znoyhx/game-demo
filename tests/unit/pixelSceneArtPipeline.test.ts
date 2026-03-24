import { describe, expect, it } from 'vitest';

import { pixelSceneRenderModelSchema } from '../../src/components/map/phaser/pixelSceneRenderer.contract';
import {
  buildPixelSceneAmbientDescriptors,
  getEntityAnimationKey,
  resolveHumanoidAnimationName,
  resolvePixelSceneEntityArt,
  resolvePixelSceneTileArt,
} from '../../src/components/map/phaser/runtime/pixelSceneArtPipeline';

describe('pixel scene art pipeline', () => {
  it('maps placeholder tile and entity art to deterministic motion presets', () => {
    expect(resolvePixelSceneTileArt('town', 'water')).toMatchObject({
      source: { kind: 'generated', designId: 'generated-tile:water' },
      motionPreset: 'waterShimmer',
      detailPreset: 'ripple',
    });
    expect(resolvePixelSceneTileArt('town', 'ember')).toMatchObject({
      motionPreset: 'emberFlicker',
      detailPreset: 'ember',
    });
    expect(resolvePixelSceneEntityArt('town', 'portal')).toMatchObject({
      source: { kind: 'generated', designId: 'generated-entity:portal' },
      motionPreset: 'portalPulse',
      animationFamily: 'portal',
      defaultAnimation: 'pulse',
      silhouette: 'portal',
    });
    expect(resolvePixelSceneEntityArt('town', 'player')).toMatchObject({
      motionPreset: 'playerWalk',
      animationFamily: 'humanoid',
      defaultAnimation: 'idle-down',
      silhouette: 'humanoid',
    });
  });

  it('derives deterministic animation keys for humanoid movement states', () => {
    expect(resolveHumanoidAnimationName(false, 'down')).toBe('idle-down');
    expect(resolveHumanoidAnimationName(true, 'side')).toBe('walk-side');
    expect(getEntityAnimationKey('town', 'player', 'walk-up')).toBe(
      'pixelforge:town:animation:player:walk-up',
    );
  });

  it('builds ambient descriptors only for animated tiles and in-scene hotspots', () => {
    const model = pixelSceneRenderModelSchema.parse({
      renderer: 'phaser',
      areaId: 'area:test',
      areaName: '测试场景',
      areaTypeLabel: '测试',
      palette: 'town',
      viewport: {
        tileSize: 24,
        widthTiles: 12,
        heightTiles: 8,
        cameraZoom: 2,
      },
      playerSpawn: { x: 2, y: 2 },
      tiles: [
        { id: 'tile:grass', x: 1, y: 1, kind: 'grass', layer: 'ground', blocked: false },
        { id: 'tile:water', x: 2, y: 1, kind: 'water', layer: 'ground', blocked: false },
        { id: 'tile:ember', x: 3, y: 1, kind: 'ember', layer: 'overlay', blocked: false },
        { id: 'tile:foliage', x: 4, y: 4, kind: 'foliage', layer: 'ground', blocked: true },
      ],
      entities: [
        {
          id: 'entity:npc',
          label: '向导',
          caption: '对话',
          type: 'npc',
          enabled: true,
          x: 4,
          y: 3,
          feedbackTone: 'success',
          autoInteractOnApproach: true,
          interactionRadius: 1.15,
        },
        {
          id: 'entity:portal',
          label: '传送门',
          caption: '区域路线',
          type: 'portal',
          targetId: 'area:next',
          enabled: true,
          x: 6,
          y: 3,
          feedbackTone: 'info',
          autoInteractOnApproach: true,
          interactionRadius: 0.85,
        },
        {
          id: 'entity:event',
          label: '事件印记',
          caption: '世界事件',
          type: 'event',
          targetId: 'event:test',
          enabled: true,
          x: 7,
          y: 4,
          feedbackTone: 'warning',
          autoInteractOnApproach: true,
          interactionRadius: 0.95,
        },
        {
          id: 'entity:battle',
          label: '战斗节点',
          caption: '进入战斗',
          type: 'battle',
          targetId: 'encounter:test',
          enabled: true,
          x: 8,
          y: 4,
          feedbackTone: 'warning',
          autoInteractOnApproach: false,
          interactionRadius: 0.95,
        },
      ],
      prompts: {
        moveHint: '移动',
        interactHint: '互动',
        portalHint: '传送',
        combatHint: '战斗',
        itemHint: '收集',
        eventHint: '事件',
        lockedHint: '锁定',
        proximityHint: '靠近',
      },
      summary: {
        blockedTileCount: 1,
        portalCount: 1,
        npcCount: 1,
        interactionCount: 4,
      },
    });

    const descriptors = buildPixelSceneAmbientDescriptors(model);

    expect(descriptors.some((descriptor) => descriptor.id === 'fx:tile:tile:water')).toBe(true);
    expect(descriptors.some((descriptor) => descriptor.id === 'fx:tile:tile:ember')).toBe(true);
    expect(descriptors.some((descriptor) => descriptor.id === 'fx:entity:entity:portal')).toBe(
      true,
    );
    expect(descriptors.some((descriptor) => descriptor.id === 'fx:entity:entity:event')).toBe(
      true,
    );
    expect(descriptors.some((descriptor) => descriptor.id === 'fx:entity:entity:battle')).toBe(
      true,
    );
    expect(descriptors.some((descriptor) => descriptor.id === 'fx:entity:entity:npc')).toBe(
      false,
    );
    expect(descriptors.some((descriptor) => descriptor.id === 'fx:tile:tile:grass')).toBe(false);
  });
});
