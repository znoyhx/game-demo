import {
  areaSceneDefinitionSchema,
  type AreaSceneDecorationLayer,
  type AreaSceneDefinition,
  type AreaSceneInteractionSpawn,
  type AreaSceneNpcSpawn,
  type AreaScenePortalSpawn,
  type AreaSceneTile,
  type AreaSceneTileKind,
  type AreaSceneTileLayer,
} from '../schemas/areaScene.schema';
import type { Area, LegacyArea } from '../schemas/area.schema';

const tileKey = (layer: AreaSceneTileLayer, x: number, y: number) =>
  `${layer}:${x}:${y}`;

export interface AreaSceneDraft {
  setTile: (
    x: number,
    y: number,
    kind: AreaSceneTileKind,
    blocked: boolean,
    layer?: AreaSceneTileLayer,
  ) => void;
  fillGround: (kind: AreaSceneTileKind) => void;
  paintRect: (
    x: number,
    y: number,
    width: number,
    height: number,
    kind: AreaSceneTileKind,
    blocked: boolean,
    layer?: AreaSceneTileLayer,
  ) => void;
  paintHorizontal: (
    x1: number,
    x2: number,
    y: number,
    kind: AreaSceneTileKind,
    blocked?: boolean,
    layer?: AreaSceneTileLayer,
  ) => void;
  paintVertical: (
    x: number,
    y1: number,
    y2: number,
    kind: AreaSceneTileKind,
    blocked?: boolean,
    layer?: AreaSceneTileLayer,
  ) => void;
  addBorder: (kind: AreaSceneTileKind) => void;
  carveWalkable: (x: number, y: number, kind?: AreaSceneTileKind) => void;
  addDecorativeLayer: (
    layer: Omit<AreaSceneDecorationLayer, 'tiles'> & {
      tiles: Array<Omit<AreaSceneTile, 'blocked'> & { blocked?: false }>;
    },
  ) => void;
  build: (input: {
    playerSpawn: { x: number; y: number };
    npcSpawns: AreaSceneNpcSpawn[];
    interactionSpawns: AreaSceneInteractionSpawn[];
    portalSpawns: AreaScenePortalSpawn[];
  }) => AreaSceneDefinition;
}

const sortTiles = (tiles: AreaSceneTile[]) =>
  [...tiles].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer === 'ground' ? -1 : 1;
    }

    if (left.y !== right.y) {
      return left.y - right.y;
    }

    return left.x - right.x;
  });

export function createAreaSceneDraft(options: {
  width: number;
  height: number;
}): AreaSceneDraft {
  const tiles = new Map<string, AreaSceneTile>();
  const decorativeLayers: AreaSceneDecorationLayer[] = [];

  const setTile: AreaSceneDraft['setTile'] = (
    x,
    y,
    kind,
    blocked,
    layer = 'ground',
  ) => {
    tiles.set(tileKey(layer, x, y), {
      id: tileKey(layer, x, y),
      x,
      y,
      kind,
      layer,
      blocked,
    });
  };

  const fillGround: AreaSceneDraft['fillGround'] = (kind) => {
    for (let y = 0; y < options.height; y += 1) {
      for (let x = 0; x < options.width; x += 1) {
        setTile(x, y, kind, false, 'ground');
      }
    }
  };

  const paintRect: AreaSceneDraft['paintRect'] = (
    x,
    y,
    width,
    height,
    kind,
    blocked,
    layer = 'overlay',
  ) => {
    for (let yOffset = 0; yOffset < height; yOffset += 1) {
      for (let xOffset = 0; xOffset < width; xOffset += 1) {
        setTile(x + xOffset, y + yOffset, kind, blocked, layer);
      }
    }
  };

  const paintHorizontal: AreaSceneDraft['paintHorizontal'] = (
    x1,
    x2,
    y,
    kind,
    blocked = false,
    layer = 'ground',
  ) => {
    const [start, end] = x1 <= x2 ? [x1, x2] : [x2, x1];
    for (let x = start; x <= end; x += 1) {
      setTile(x, y, kind, blocked, layer);
    }
  };

  const paintVertical: AreaSceneDraft['paintVertical'] = (
    x,
    y1,
    y2,
    kind,
    blocked = false,
    layer = 'ground',
  ) => {
    const [start, end] = y1 <= y2 ? [y1, y2] : [y2, y1];
    for (let y = start; y <= end; y += 1) {
      setTile(x, y, kind, blocked, layer);
    }
  };

  const addBorder: AreaSceneDraft['addBorder'] = (kind) => {
    paintHorizontal(0, options.width - 1, 0, kind, true, 'overlay');
    paintHorizontal(
      0,
      options.width - 1,
      options.height - 1,
      kind,
      true,
      'overlay',
    );
    paintVertical(0, 0, options.height - 1, kind, true, 'overlay');
    paintVertical(
      options.width - 1,
      0,
      options.height - 1,
      kind,
      true,
      'overlay',
    );
  };

  const carveWalkable: AreaSceneDraft['carveWalkable'] = (
    x,
    y,
    kind = 'path',
  ) => {
    setTile(x, y, kind, false, 'ground');
    tiles.delete(tileKey('overlay', x, y));
  };

  const addDecorativeLayer: AreaSceneDraft['addDecorativeLayer'] = (layer) => {
    decorativeLayers.push({
      ...layer,
      tiles: layer.tiles.map((tile) => ({
        ...tile,
        blocked: false,
      })),
    });
  };

  const build: AreaSceneDraft['build'] = ({
    playerSpawn,
    npcSpawns,
    interactionSpawns,
    portalSpawns,
  }) =>
    areaSceneDefinitionSchema.parse({
      grid: {
        width: options.width,
        height: options.height,
      },
      playerSpawn,
      tiles: sortTiles(Array.from(tiles.values())),
      decorativeLayers,
      npcSpawns,
      interactionSpawns,
      portalSpawns,
    });

  return {
    setTile,
    fillGround,
    paintRect,
    paintHorizontal,
    paintVertical,
    addBorder,
    carveWalkable,
    addDecorativeLayer,
    build,
  };
}

const deriveSceneBindings = (
  area: Pick<LegacyArea, 'interactionPoints'>,
): {
  npcSpawns: AreaSceneNpcSpawn[];
  interactionSpawns: AreaSceneInteractionSpawn[];
  portalSpawns: AreaScenePortalSpawn[];
} => ({
  npcSpawns: area.interactionPoints.flatMap((point) => {
    if (
      (point.type === 'npc' || point.type === 'shop') &&
      point.targetId
    ) {
      return [
        {
          npcId: point.targetId,
          x: point.x,
          y: point.y,
        },
      ];
    }

    return [];
  }),
  interactionSpawns: area.interactionPoints.flatMap((point) => {
    if (
      point.type === 'npc' ||
      point.type === 'shop' ||
      point.type === 'portal'
    ) {
      return [];
    }

    return [
      {
        interactionId: point.id,
        x: point.x,
        y: point.y,
      },
    ];
  }),
  portalSpawns: area.interactionPoints.flatMap((point) => {
    if (point.type !== 'portal' || !point.targetId) {
      return [];
    }

    return [
      {
        interactionId: point.id,
        targetAreaId: point.targetId,
        travelMode: point.travelMode ?? 'walk',
        x: point.x,
        y: point.y,
      },
    ];
  }),
});

const sceneDefaultsByAreaType: Record<
  LegacyArea['type'],
  {
    width: number;
    height: number;
    playerSpawn: { x: number; y: number };
    groundKind: AreaSceneTileKind;
    borderKind: AreaSceneTileKind;
  }
> = {
  town: {
    width: 16,
    height: 12,
    playerSpawn: { x: 2, y: 9 },
    groundKind: 'grass',
    borderKind: 'wall',
  },
  shop: {
    width: 16,
    height: 12,
    playerSpawn: { x: 2, y: 9 },
    groundKind: 'wood',
    borderKind: 'wall',
  },
  wilderness: {
    width: 16,
    height: 12,
    playerSpawn: { x: 2, y: 9 },
    groundKind: 'grass',
    borderKind: 'foliage',
  },
  hidden: {
    width: 16,
    height: 12,
    playerSpawn: { x: 2, y: 9 },
    groundKind: 'grass',
    borderKind: 'foliage',
  },
  ruin: {
    width: 18,
    height: 12,
    playerSpawn: { x: 2, y: 9 },
    groundKind: 'stone',
    borderKind: 'wall',
  },
  dungeon: {
    width: 18,
    height: 12,
    playerSpawn: { x: 2, y: 9 },
    groundKind: 'stone',
    borderKind: 'wall',
  },
  boss: {
    width: 16,
    height: 12,
    playerSpawn: { x: 2, y: 9 },
    groundKind: 'stone',
    borderKind: 'wall',
  },
};

const paintFallbackPreset = (
  draft: AreaSceneDraft,
  area: Pick<LegacyArea, 'type'>,
  width: number,
  height: number,
) => {
  switch (area.type) {
    case 'town':
      draft.paintHorizontal(2, width - 2, height - 4, 'path');
      draft.paintVertical(Math.floor(width / 2), 2, height - 2, 'path');
      draft.paintRect(2, 2, 4, 2, 'wall', true);
      draft.paintRect(width - 6, 2, 4, 3, 'wall', true);
      break;
    case 'shop':
      draft.paintHorizontal(2, width - 2, height - 4, 'path');
      draft.paintRect(3, 2, width - 6, 2, 'wall', true);
      draft.paintRect(4, 5, 3, 2, 'wood', true);
      draft.paintRect(width - 7, 5, 3, 2, 'wood', true);
      break;
    case 'wilderness':
    case 'hidden':
      draft.paintHorizontal(2, width - 2, height - 4, 'path');
      draft.paintRect(width - 5, 3, 3, 4, 'foliage', true);
      draft.paintRect(2, 4, 3, 3, 'foliage', true);
      draft.paintVertical(Math.max(3, width - 6), 4, height - 3, 'water', true);
      break;
    case 'ruin':
    case 'dungeon':
      draft.paintHorizontal(2, width - 2, height - 4, 'path');
      draft.paintVertical(Math.floor(width / 2), 2, height - 3, 'path');
      draft.paintRect(3, 3, 3, 2, 'wall', true);
      draft.paintRect(width - 6, 3, 3, 2, 'wall', true);
      draft.paintRect(Math.floor(width / 2) - 1, 6, 2, 2, 'wall', true);
      break;
    case 'boss':
      draft.paintHorizontal(2, width - 3, height - 4, 'path');
      draft.paintVertical(Math.floor(width / 2), 2, height - 3, 'path');
      draft.paintRect(Math.floor(width / 2) - 2, 4, 4, 3, 'ember', false, 'ground');
      draft.paintRect(4, 4, 2, 2, 'wall', true);
      draft.paintRect(width - 6, 4, 2, 2, 'wall', true);
      break;
  }
};

export function buildDefaultAreaSceneDefinition(
  area: Pick<LegacyArea, 'id' | 'type' | 'npcIds' | 'interactionPoints'>,
): AreaSceneDefinition {
  const sceneDefaults = sceneDefaultsByAreaType[area.type];
  const maxPointX = Math.max(0, ...area.interactionPoints.map((point) => point.x));
  const maxPointY = Math.max(0, ...area.interactionPoints.map((point) => point.y));
  const width = Math.max(sceneDefaults.width, maxPointX + 3);
  const height = Math.max(sceneDefaults.height, maxPointY + 3);
  const draft = createAreaSceneDraft({ width, height });
  const bindings = deriveSceneBindings(area);

  draft.fillGround(sceneDefaults.groundKind);
  draft.addBorder(sceneDefaults.borderKind);
  paintFallbackPreset(draft, area, width, height);

  const playerSpawn = {
    x: Math.min(sceneDefaults.playerSpawn.x, width - 2),
    y: Math.min(sceneDefaults.playerSpawn.y, height - 2),
  };
  draft.carveWalkable(playerSpawn.x, playerSpawn.y);

  for (const spawn of bindings.npcSpawns) {
    draft.carveWalkable(spawn.x, spawn.y);
  }

  for (const spawn of bindings.interactionSpawns) {
    draft.carveWalkable(spawn.x, spawn.y);
  }

  for (const spawn of bindings.portalSpawns) {
    draft.carveWalkable(spawn.x, spawn.y);
  }

  draft.addDecorativeLayer({
    id: `decor:scene:${area.id}`,
    label: '环境点缀',
    layer: 'overlay',
    tiles: [
      {
        id: `decor:scene:${area.id}:a`,
        x: Math.max(1, width - 4),
        y: 1,
        kind: area.type === 'boss' ? 'ember' : 'bridge',
        layer: 'overlay',
      },
      {
        id: `decor:scene:${area.id}:b`,
        x: 1,
        y: Math.max(1, height - 3),
        kind: area.type === 'wilderness' || area.type === 'hidden' ? 'foliage' : 'stone',
        layer: 'overlay',
      },
    ],
  });

  return draft.build({
    playerSpawn,
    npcSpawns:
      bindings.npcSpawns.length > 0
        ? bindings.npcSpawns
        : area.npcIds.map((npcId, index) => ({
            npcId,
            x: Math.min(2 + index, width - 2),
            y: Math.max(2, height - 3 - index),
          })),
    interactionSpawns: bindings.interactionSpawns,
    portalSpawns: bindings.portalSpawns,
  });
}

export function ensureAreaSceneDefinition<TArea extends LegacyArea | Area>(
  area: TArea,
): Area {
  if ('scene' in area && area.scene) {
    return area as Area;
  }

  return {
    ...area,
    scene: buildDefaultAreaSceneDefinition(area),
  } as Area;
}
