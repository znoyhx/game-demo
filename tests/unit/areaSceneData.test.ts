import { describe, expect, it } from 'vitest';

import { mockAreas } from '../../src/core/mocks/mvp/areas';
import { areaSchema } from '../../src/core/schemas';

describe('area scene data', () => {
  it('gives every mock area explicit tile scene data aligned with domain bindings', () => {
    expect(mockAreas.every((area) => areaSchema.safeParse(area).success)).toBe(true);
    expect(
      mockAreas.every(
        (area) =>
          area.scene.tiles.length > 0 &&
          area.scene.decorativeLayers.length > 0 &&
          area.scene.grid.width >= 12 &&
          area.scene.grid.height >= 8,
      ),
    ).toBe(true);
    expect(
      mockAreas.every(
        (area) =>
          area.scene.npcSpawns.length >= area.interactionPoints.filter(
            (point) => point.type === 'npc' || point.type === 'shop',
          ).length,
      ),
    ).toBe(true);
    expect(
      mockAreas.every(
        (area) =>
          area.scene.portalSpawns.length ===
          area.interactionPoints.filter((point) => point.type === 'portal').length,
      ),
    ).toBe(true);
    expect(
      mockAreas.every(
        (area) =>
          area.scene.interactionSpawns.length ===
          area.interactionPoints.filter(
            (point) =>
              point.type !== 'npc' && point.type !== 'shop' && point.type !== 'portal',
          ).length,
      ),
    ).toBe(true);
    expect(
      mockAreas
        .filter((area) => area.eventIds.length > 0)
        .every((area) =>
          area.interactionPoints.some(
            (point) => point.type === 'event' && area.eventIds.includes(point.targetId ?? ''),
          ),
        ),
    ).toBe(true);
  });
});
