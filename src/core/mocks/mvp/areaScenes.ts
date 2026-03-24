import type { AreaSceneDefinition } from '../../schemas';
import { createAreaSceneDraft } from '../../utils/areaSceneDefinition';
import { mockIds } from './constants';

const buildCrossroadsScene = () => {
  const draft = createAreaSceneDraft({ width: 16, height: 12 });

  draft.fillGround('grass');
  draft.addBorder('wall');
  draft.paintHorizontal(1, 14, 8, 'path');
  draft.paintVertical(6, 2, 10, 'path');
  draft.paintRect(2, 2, 3, 2, 'wall', true);
  draft.paintRect(9, 2, 4, 2, 'wall', true);
  draft.paintRect(11, 9, 3, 2, 'water', true);
  draft.paintRect(7, 4, 2, 2, 'wood', true);

  draft.addDecorativeLayer({
    id: 'decor:crossroads:embers',
    label: '前哨火盆',
    layer: 'overlay',
    tiles: [
      {
        id: 'decor:crossroads:embers:a',
        x: 5,
        y: 7,
        kind: 'ember',
        layer: 'overlay',
      },
      {
        id: 'decor:crossroads:embers:b',
        x: 10,
        y: 7,
        kind: 'ember',
        layer: 'overlay',
      },
    ],
  });

  draft.carveWalkable(3, 9);
  draft.carveWalkable(5, 4);
  draft.carveWalkable(8, 3);
  draft.carveWalkable(11, 6);

  return draft.build({
    playerSpawn: { x: 3, y: 9 },
    npcSpawns: [
      {
        npcId: mockIds.npcs.lyra,
        x: 5,
        y: 4,
      },
      {
        npcId: mockIds.npcs.brom,
        x: 8,
        y: 3,
      },
    ],
    interactionSpawns: [
      {
        interactionId: 'interaction:crossroads-ashfall-bell',
        x: 10,
        y: 7,
      },
    ],
    portalSpawns: [
      {
        interactionId: 'interaction:crossroads-archive-gate',
        targetAreaId: mockIds.areas.archive,
        travelMode: 'walk',
        x: 11,
        y: 6,
      },
    ],
  });
};

const buildArchiveScene = () => {
  const draft = createAreaSceneDraft({ width: 18, height: 12 });

  draft.fillGround('stone');
  draft.addBorder('wall');
  draft.paintHorizontal(2, 15, 8, 'path');
  draft.paintVertical(6, 2, 9, 'path');
  draft.paintRect(3, 2, 3, 2, 'wall', true);
  draft.paintRect(10, 2, 5, 2, 'wall', true);
  draft.paintRect(8, 5, 2, 2, 'wall', true);
  draft.paintRect(13, 6, 2, 3, 'wall', true);

  draft.addDecorativeLayer({
    id: 'decor:archive:runes',
    label: '回响符文',
    layer: 'overlay',
    tiles: [
      {
        id: 'decor:archive:runes:a',
        x: 12,
        y: 4,
        kind: 'ember',
        layer: 'overlay',
      },
      {
        id: 'decor:archive:runes:b',
        x: 4,
        y: 8,
        kind: 'bridge',
        layer: 'overlay',
      },
    ],
  });

  draft.carveWalkable(3, 9);
  draft.carveWalkable(4, 6);
  draft.carveWalkable(9, 5);
  draft.carveWalkable(12, 2);
  draft.carveWalkable(2, 2);

  return draft.build({
    playerSpawn: { x: 3, y: 9 },
    npcSpawns: [
      {
        npcId: mockIds.npcs.mirel,
        x: 4,
        y: 6,
      },
      {
        npcId: mockIds.npcs.rowan,
        x: 9,
        y: 5,
      },
    ],
    interactionSpawns: [
      {
        interactionId: 'interaction:archive-echo-core',
        x: 12,
        y: 4,
      },
    ],
    portalSpawns: [
      {
        interactionId: 'interaction:archive-sanctum-seal',
        targetAreaId: mockIds.areas.sanctum,
        travelMode: 'walk',
        x: 12,
        y: 2,
      },
      {
        interactionId: 'interaction:archive-grotto-gate',
        targetAreaId: mockIds.areas.grotto,
        travelMode: 'teleport',
        x: 2,
        y: 2,
      },
    ],
  });
};

const buildSanctumScene = () => {
  const draft = createAreaSceneDraft({ width: 16, height: 12 });

  draft.fillGround('stone');
  draft.addBorder('wall');
  draft.paintHorizontal(2, 13, 8, 'path');
  draft.paintVertical(7, 2, 9, 'path');
  draft.paintRect(6, 4, 3, 3, 'ember', false, 'ground');
  draft.paintRect(3, 3, 2, 2, 'wall', true);
  draft.paintRect(11, 3, 2, 2, 'wall', true);
  draft.paintRect(5, 9, 6, 1, 'ember', false, 'ground');

  draft.addDecorativeLayer({
    id: 'decor:sanctum:flare',
    label: '封印裂焰',
    layer: 'overlay',
    tiles: [
      {
        id: 'decor:sanctum:flare:a',
        x: 7,
        y: 3,
        kind: 'ember',
        layer: 'overlay',
      },
      {
        id: 'decor:sanctum:flare:b',
        x: 2,
        y: 7,
        kind: 'bridge',
        layer: 'overlay',
      },
    ],
  });

  draft.carveWalkable(2, 9);
  draft.carveWalkable(7, 2);
  draft.carveWalkable(2, 6);

  return draft.build({
    playerSpawn: { x: 2, y: 9 },
    npcSpawns: [
      {
        npcId: mockIds.npcs.ashWarden,
        x: 7,
        y: 2,
      },
    ],
    interactionSpawns: [
      {
        interactionId: 'interaction:sanctum-warden',
        x: 7,
        y: 2,
      },
      {
        interactionId: 'interaction:sanctum-countermeasure-sigil',
        x: 7,
        y: 4,
      },
    ],
    portalSpawns: [
      {
        interactionId: 'interaction:sanctum-retreat-route',
        targetAreaId: mockIds.areas.archive,
        travelMode: 'walk',
        x: 2,
        y: 6,
      },
    ],
  });
};

const buildGrottoScene = () => {
  const draft = createAreaSceneDraft({ width: 16, height: 12 });

  draft.fillGround('grass');
  draft.addBorder('foliage');
  draft.paintHorizontal(2, 12, 8, 'path');
  draft.paintVertical(11, 3, 8, 'water', true);
  draft.paintRect(4, 3, 3, 2, 'foliage', true);
  draft.paintRect(8, 4, 2, 2, 'foliage', true);
  draft.paintRect(6, 9, 3, 1, 'bridge', false, 'ground');

  draft.addDecorativeLayer({
    id: 'decor:grotto:roots',
    label: '跃迁根系',
    layer: 'overlay',
    tiles: [
      {
        id: 'decor:grotto:roots:a',
        x: 3,
        y: 2,
        kind: 'ember',
        layer: 'overlay',
      },
      {
        id: 'decor:grotto:roots:b',
        x: 9,
        y: 4,
        kind: 'ember',
        layer: 'overlay',
      },
    ],
  });

  draft.carveWalkable(3, 9);
  draft.carveWalkable(3, 3);
  draft.carveWalkable(9, 5);

  return draft.build({
    playerSpawn: { x: 3, y: 9 },
    npcSpawns: [],
    interactionSpawns: [
      {
        interactionId: 'interaction:grotto-cache',
        x: 9,
        y: 5,
      },
    ],
    portalSpawns: [
      {
        interactionId: 'interaction:grotto-crossroads-teleport',
        targetAreaId: mockIds.areas.crossroads,
        travelMode: 'teleport',
        x: 3,
        y: 3,
      },
    ],
  });
};

export const mockAreaSceneDefinitions: Record<string, AreaSceneDefinition> = {
  [mockIds.areas.crossroads]: buildCrossroadsScene(),
  [mockIds.areas.archive]: buildArchiveScene(),
  [mockIds.areas.sanctum]: buildSanctumScene(),
  [mockIds.areas.grotto]: buildGrottoScene(),
};
