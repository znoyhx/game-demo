export type GeneratedSpriteFamily =
  | 'humanoid'
  | 'portal'
  | 'event'
  | 'battle'
  | 'item';

export type GeneratedSpriteAnimationKey =
  | 'idle'
  | 'idle-down'
  | 'walk-down'
  | 'idle-side'
  | 'walk-side'
  | 'idle-up'
  | 'walk-up'
  | 'pulse'
  | 'alarm';

export type GeneratedSpriteToken =
  | '.'
  | 'o'
  | 'p'
  | 's'
  | 'a'
  | 'd'
  | 'h'
  | 'g';

export interface GeneratedSpriteFrameDefinition {
  key: string;
  pixels: readonly string[];
}

export interface GeneratedSpriteAnimationDefinition {
  key: GeneratedSpriteAnimationKey;
  frames: readonly string[];
  frameRate: number;
  repeat: number;
}

export interface GeneratedSpriteSheetDefinition {
  family: GeneratedSpriteFamily;
  frameWidth: number;
  frameHeight: number;
  frames: readonly GeneratedSpriteFrameDefinition[];
  animations: readonly GeneratedSpriteAnimationDefinition[];
  defaultAnimation: GeneratedSpriteAnimationKey;
}

type MutableGrid = GeneratedSpriteToken[][];

const FRAME_WIDTH = 12;
const FRAME_HEIGHT = 12;

const validTokens = new Set<GeneratedSpriteToken>([
  '.',
  'o',
  'p',
  's',
  'a',
  'd',
  'h',
  'g',
]);

const createGrid = () =>
  Array.from({ length: FRAME_HEIGHT }, () =>
    Array.from({ length: FRAME_WIDTH }, () => '.' as GeneratedSpriteToken),
  );

const setPixel = (
  grid: MutableGrid,
  x: number,
  y: number,
  token: GeneratedSpriteToken,
) => {
  if (
    x < 0 ||
    x >= FRAME_WIDTH ||
    y < 0 ||
    y >= FRAME_HEIGHT ||
    token === '.'
  ) {
    return;
  }

  grid[y][x] = token;
};

const fillRect = (
  grid: MutableGrid,
  x: number,
  y: number,
  width: number,
  height: number,
  token: GeneratedSpriteToken,
) => {
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      setPixel(grid, x + offsetX, y + offsetY, token);
    }
  }
};

const strokeRect = (
  grid: MutableGrid,
  x: number,
  y: number,
  width: number,
  height: number,
  token: GeneratedSpriteToken,
) => {
  for (let offsetX = 0; offsetX < width; offsetX += 1) {
    setPixel(grid, x + offsetX, y, token);
    setPixel(grid, x + offsetX, y + height - 1, token);
  }

  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    setPixel(grid, x, y + offsetY, token);
    setPixel(grid, x + width - 1, y + offsetY, token);
  }
};

const finalizeFrame = (
  key: string,
  grid: MutableGrid,
): GeneratedSpriteFrameDefinition => ({
  key,
  pixels: grid.map((row) => row.join('')),
});

type HumanoidFacing = 'down' | 'up' | 'side';
type WalkPhase = 'idleA' | 'idleB' | 'stepLeft' | 'stepRight';

const createHumanoidFrame = (
  key: string,
  facing: HumanoidFacing,
  phase: WalkPhase,
) => {
  const grid = createGrid();

  const headX = facing === 'side' ? 5 : 4;
  const headWidth = facing === 'side' ? 3 : 4;
  fillRect(grid, headX, 0, headWidth, 3, 's');
  strokeRect(grid, headX, 0, headWidth, 3, 'o');
  setPixel(grid, headX + 1, 1, 'h');
  if (facing === 'up') {
    fillRect(grid, headX, 0, headWidth, 1, 'a');
  } else {
    setPixel(grid, headX + headWidth - 2, 1, 'h');
  }

  const bodyX = facing === 'side' ? 5 : 4;
  const bodyWidth = facing === 'side' ? 3 : 4;
  fillRect(grid, bodyX, 3, bodyWidth, 4, 'p');
  strokeRect(grid, bodyX, 3, bodyWidth, 4, 'o');
  fillRect(grid, bodyX, 5, bodyWidth, 1, 'a');
  setPixel(grid, bodyX + 1, 4, 'd');
  setPixel(grid, bodyX + bodyWidth - 2, 6, 'h');

  if (facing === 'down') {
    const leftArmX = phase === 'stepLeft' ? 2 : 3;
    const rightArmX = phase === 'stepRight' ? 8 : 7;
    fillRect(grid, leftArmX, 4, 1, phase === 'idleB' ? 2 : 3, 's');
    fillRect(grid, rightArmX, 4, 1, phase === 'idleA' ? 2 : 3, 's');
    setPixel(grid, leftArmX, 3, 'o');
    setPixel(grid, rightArmX, 3, 'o');
    setPixel(grid, leftArmX, 6, 'o');
    setPixel(grid, rightArmX, 6, 'o');
  } else if (facing === 'up') {
    const armY = phase === 'idleB' ? 5 : 4;
    fillRect(grid, 3, armY, 1, 2, 'd');
    fillRect(grid, 8, armY, 1, 2, 'd');
    setPixel(grid, 3, armY - 1, 'o');
    setPixel(grid, 8, armY - 1, 'o');
  } else {
    const frontArmY = phase === 'stepRight' ? 5 : 4;
    fillRect(grid, 4, 4, 1, 2, 'd');
    fillRect(grid, 8, frontArmY, 1, 3, 's');
    setPixel(grid, 4, 3, 'o');
    setPixel(grid, 8, frontArmY - 1, 'o');
    setPixel(grid, 8, frontArmY + 2, 'o');
  }

  const leftLegX = facing === 'side' ? 5 : 4;
  const rightLegX = facing === 'side' ? 6 : 6;
  const leftLegHeight = phase === 'stepLeft' ? 4 : 3;
  const rightLegHeight = phase === 'stepRight' ? 4 : 3;
  fillRect(grid, leftLegX, 7, 1, leftLegHeight, 'p');
  fillRect(grid, rightLegX, 7, 1, rightLegHeight, 'p');
  fillRect(grid, leftLegX + 1, 7, 1, facing === 'side' ? 0 : 3, 'd');
  if (facing !== 'side') {
    fillRect(grid, rightLegX + 1, 7, 1, 3, 'd');
  }

  setPixel(grid, leftLegX, 10, 'o');
  setPixel(grid, rightLegX, 10, 'o');
  if (phase === 'stepLeft') {
    setPixel(grid, leftLegX - 1, 10, 'o');
  }
  if (phase === 'stepRight') {
    setPixel(grid, rightLegX + 1, 10, 'o');
  }

  fillRect(grid, 4, 10, facing === 'side' ? 3 : 4, 1, 'o');
  return finalizeFrame(key, grid);
};

const createPortalFrame = (key: string, phase: 0 | 1 | 2 | 3) => {
  const grid = createGrid();
  const center = 5.5;
  const outerRadius = 4 - phase * 0.25;
  const innerRadius = 2.1 + phase * 0.18;

  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= outerRadius && distance >= outerRadius - 0.9) {
        setPixel(grid, x, y, phase % 2 === 0 ? 'g' : 'a');
      } else if (distance < outerRadius - 0.9 && distance >= innerRadius) {
        setPixel(grid, x, y, 'p');
      } else if (distance < innerRadius) {
        setPixel(grid, x, y, phase >= 2 ? 'h' : 's');
      }
    }
  }

  strokeRect(grid, 3, 2, 6, 8, 'o');
  return finalizeFrame(key, grid);
};

const createEventFrame = (key: string, phase: 0 | 1 | 2 | 3) => {
  const grid = createGrid();
  const center = 5;
  const rays = phase >= 2 ? 2 : 1;

  for (let offset = 0; offset <= 2; offset += 1) {
    setPixel(grid, center, 2 + offset, 'a');
    setPixel(grid, center - offset, 5, offset === 2 ? 'g' : 'p');
    setPixel(grid, center + offset, 5, offset === 2 ? 'g' : 'p');
    setPixel(grid, center, 5 + offset, offset === 2 ? 'g' : 'p');
  }

  setPixel(grid, center, 1, 'g');
  setPixel(grid, center - 1, 2, 'g');
  setPixel(grid, center + 1, 2, 'g');
  setPixel(grid, center - 1, 6, 'g');
  setPixel(grid, center + 1, 6, 'g');
  setPixel(grid, center, 7, 'g');

  for (let ray = 1; ray <= rays; ray += 1) {
    setPixel(grid, center, 1 - ray + 1, 'h');
    setPixel(grid, center - 2 - ray + 1, 5, 'h');
    setPixel(grid, center + 2 + ray - 1, 5, 'h');
    setPixel(grid, center, 7 + ray, 'h');
  }

  strokeRect(grid, 4, 2, 3, 6, 'o');
  return finalizeFrame(key, grid);
};

const createBattleFrame = (key: string, phase: 0 | 1 | 2 | 3) => {
  const grid = createGrid();
  const bannerHeight = phase >= 2 ? 5 : 4;

  fillRect(grid, 4, 2, 4, bannerHeight, 'p');
  strokeRect(grid, 4, 2, 4, bannerHeight, 'o');
  fillRect(grid, 5, 3, 2, bannerHeight - 2, 'a');
  setPixel(grid, 5, 7, 'o');
  setPixel(grid, 6, 7, 'o');

  fillRect(grid, 5, 8, 2, 2, phase % 2 === 0 ? 'g' : 'h');
  setPixel(grid, 5, 10, 'g');
  setPixel(grid, 6, 10, 'g');
  setPixel(grid, 4, 1, 'd');
  setPixel(grid, 7, 1, 'd');

  if (phase >= 1) {
    setPixel(grid, 3, 3, 'g');
    setPixel(grid, 8, 3, 'g');
  }

  if (phase >= 2) {
    setPixel(grid, 2, 4, 'h');
    setPixel(grid, 9, 4, 'h');
    setPixel(grid, 4, 9, 'h');
    setPixel(grid, 7, 9, 'h');
  }

  return finalizeFrame(key, grid);
};

const createItemFrame = (key: string, phase: 0 | 1) => {
  const grid = createGrid();

  fillRect(grid, 3, 4, 6, 4, 'p');
  strokeRect(grid, 3, 4, 6, 4, 'o');
  fillRect(grid, 3, 4, 6, 1, 'a');
  fillRect(grid, 5, 5, 2, 2, 's');
  setPixel(grid, 4, 6, 'd');
  setPixel(grid, 7, 6, 'd');
  setPixel(grid, 8, 3, phase === 0 ? 'g' : 'h');
  setPixel(grid, 9, 2, phase === 0 ? 'h' : 'g');
  setPixel(grid, 8, 1, phase === 0 ? 'g' : '.');

  return finalizeFrame(key, grid);
};

export const generatedSpriteSheets: Record<
  GeneratedSpriteFamily,
  GeneratedSpriteSheetDefinition
> = {
  humanoid: {
    family: 'humanoid',
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    defaultAnimation: 'idle-down',
    frames: [
      createHumanoidFrame('down-idle-a', 'down', 'idleA'),
      createHumanoidFrame('down-idle-b', 'down', 'idleB'),
      createHumanoidFrame('down-step-left', 'down', 'stepLeft'),
      createHumanoidFrame('down-step-right', 'down', 'stepRight'),
      createHumanoidFrame('side-idle-a', 'side', 'idleA'),
      createHumanoidFrame('side-idle-b', 'side', 'idleB'),
      createHumanoidFrame('side-step-left', 'side', 'stepLeft'),
      createHumanoidFrame('side-step-right', 'side', 'stepRight'),
      createHumanoidFrame('up-idle-a', 'up', 'idleA'),
      createHumanoidFrame('up-idle-b', 'up', 'idleB'),
      createHumanoidFrame('up-step-left', 'up', 'stepLeft'),
      createHumanoidFrame('up-step-right', 'up', 'stepRight'),
    ],
    animations: [
      {
        key: 'idle-down',
        frames: ['down-idle-a', 'down-idle-b'],
        frameRate: 3,
        repeat: -1,
      },
      {
        key: 'walk-down',
        frames: ['down-step-left', 'down-idle-a', 'down-step-right', 'down-idle-b'],
        frameRate: 7,
        repeat: -1,
      },
      {
        key: 'idle-side',
        frames: ['side-idle-a', 'side-idle-b'],
        frameRate: 3,
        repeat: -1,
      },
      {
        key: 'walk-side',
        frames: ['side-step-left', 'side-idle-a', 'side-step-right', 'side-idle-b'],
        frameRate: 7,
        repeat: -1,
      },
      {
        key: 'idle-up',
        frames: ['up-idle-a', 'up-idle-b'],
        frameRate: 3,
        repeat: -1,
      },
      {
        key: 'walk-up',
        frames: ['up-step-left', 'up-idle-a', 'up-step-right', 'up-idle-b'],
        frameRate: 7,
        repeat: -1,
      },
    ],
  },
  portal: {
    family: 'portal',
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    defaultAnimation: 'pulse',
    frames: [
      createPortalFrame('portal-a', 0),
      createPortalFrame('portal-b', 1),
      createPortalFrame('portal-c', 2),
      createPortalFrame('portal-d', 3),
    ],
    animations: [
      {
        key: 'pulse',
        frames: ['portal-a', 'portal-b', 'portal-c', 'portal-d'],
        frameRate: 6,
        repeat: -1,
      },
    ],
  },
  event: {
    family: 'event',
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    defaultAnimation: 'pulse',
    frames: [
      createEventFrame('event-a', 0),
      createEventFrame('event-b', 1),
      createEventFrame('event-c', 2),
      createEventFrame('event-d', 3),
    ],
    animations: [
      {
        key: 'pulse',
        frames: ['event-a', 'event-b', 'event-c', 'event-d'],
        frameRate: 6,
        repeat: -1,
      },
    ],
  },
  battle: {
    family: 'battle',
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    defaultAnimation: 'alarm',
    frames: [
      createBattleFrame('battle-a', 0),
      createBattleFrame('battle-b', 1),
      createBattleFrame('battle-c', 2),
      createBattleFrame('battle-d', 3),
    ],
    animations: [
      {
        key: 'alarm',
        frames: ['battle-a', 'battle-b', 'battle-c', 'battle-d'],
        frameRate: 7,
        repeat: -1,
      },
    ],
  },
  item: {
    family: 'item',
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    defaultAnimation: 'idle',
    frames: [createItemFrame('item-a', 0), createItemFrame('item-b', 1)],
    animations: [
      {
        key: 'idle',
        frames: ['item-a', 'item-b'],
        frameRate: 2,
        repeat: -1,
      },
    ],
  },
};

export const getGeneratedSpriteSheetDefinition = (
  family: GeneratedSpriteFamily,
) => generatedSpriteSheets[family];

export const getGeneratedSpriteValidTokens = () => validTokens;
