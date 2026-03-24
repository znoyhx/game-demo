import { describe, expect, it } from 'vitest';

import { mockAreas } from '../../src/core/mocks/mvp/areas';
import { buildPixelSceneRenderModel } from '../../src/components/map/phaser/buildPixelSceneRenderModel';

describe('pixel scene render model', () => {
  it('builds a deterministic phaser-ready tile scene from explicit area scene data', () => {
    const archive = mockAreas.find((area) => area.id === 'area:sunken-archive');

    expect(archive).toBeTruthy();

    const model = buildPixelSceneRenderModel({
      area: archive ?? null,
      areaTypeLabel: '遗迹',
      markers: [
        {
          id: 'interaction:archive-mirel',
          label: '与米蕾尔检查记录',
          caption: '对话 / 信任',
          glyph: '角',
          typeLabel: '角色',
          type: 'npc',
          targetId: 'npc:mirel-scribe',
          enabled: true,
          xPercent: 32,
          yPercent: 61,
          feedbackTone: 'success',
          state: 'focus',
        },
        {
          id: 'interaction:archive-sanctum-seal',
          label: '接近圣所封印',
          caption: '路线未解锁',
          glyph: '传',
          typeLabel: '传送',
          type: 'portal',
          targetId: 'area:ember-sanctum',
          enabled: false,
          xPercent: 88,
          yPercent: 24,
          feedbackTone: 'default',
          state: 'disabled',
        },
        {
          id: 'interaction:archive-echo-core',
          label: '聆听秘库回响',
          caption: '待触发事件',
          glyph: '事',
          typeLabel: '事件',
          type: 'event',
          targetId: 'event:archive-echoes',
          enabled: true,
          xPercent: 72,
          yPercent: 35,
          feedbackTone: 'warning',
          state: 'alert',
        },
      ],
    });

    expect(model.renderer).toBe('phaser');
    expect(model.viewport.widthTiles).toBe(archive?.scene.grid.width);
    expect(model.viewport.heightTiles).toBe(archive?.scene.grid.height);
    expect(model.playerSpawn).toEqual(archive?.scene.playerSpawn);
    expect(model.tiles.length).toBeGreaterThan(archive?.scene.tiles.length ?? 0);
    expect(model.summary.blockedTileCount).toBeGreaterThan(0);
    expect(model.summary.portalCount).toBe(archive?.scene.portalSpawns.length);
    expect(model.summary.npcCount).toBe(archive?.scene.npcSpawns.length);
    expect(
      model.entities.find((entity) => entity.targetId === 'area:ember-sanctum')?.enabled,
    ).toBe(false);
    expect(
      model.entities.find((entity) => entity.targetId === 'area:ember-sanctum')?.x,
    ).toBe(archive?.scene.portalSpawns[0]?.x);
    expect(
      model.entities.find((entity) => entity.targetId === 'npc:mirel-scribe')?.y,
    ).toBe(archive?.scene.npcSpawns[0]?.y);
    expect(
      model.entities.find((entity) => entity.type === 'npc')?.autoInteractOnApproach,
    ).toBe(true);
    expect(
      model.entities.find((entity) => entity.type === 'portal')?.autoInteractOnApproach,
    ).toBe(true);
    expect(
      model.entities.find((entity) => entity.type === 'event')?.autoInteractOnApproach,
    ).toBe(true);
    expect(
      model.entities.find((entity) => entity.type === 'battle')?.autoInteractOnApproach ?? false,
    ).toBe(false);
    expect(
      model.entities.every(
        (entity) =>
          entity.x >= 0 &&
          entity.x < model.viewport.widthTiles &&
          entity.y >= 0 &&
          entity.y < model.viewport.heightTiles,
      ),
    ).toBe(true);
    expect(
      model.tiles.some((tile) => tile.kind === 'ember' || tile.kind === 'bridge'),
    ).toBe(true);
  });
});
