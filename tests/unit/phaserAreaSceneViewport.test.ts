// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { areaSceneStageModelSchema } from '../../src/components/map/areaSceneStage.contract';
import { PhaserAreaSceneViewport } from '../../src/components/map/phaser/PhaserAreaSceneViewport';
import { pixelSceneRenderModelSchema } from '../../src/components/map/phaser/pixelSceneRenderer.contract';

const buildRenderScene = () =>
  pixelSceneRenderModelSchema.parse({
    renderer: 'phaser',
    areaId: 'area:test',
    areaName: '测试区域',
    areaTypeLabel: '遗迹',
    palette: 'ruin',
    viewport: {
      tileSize: 24,
      widthTiles: 12,
      heightTiles: 8,
      cameraZoom: 2,
    },
    playerSpawn: { x: 2, y: 2 },
    tiles: [
      {
        id: 'tile:1',
        x: 0,
        y: 0,
        kind: 'stone',
        layer: 'ground',
        blocked: false,
      },
    ],
    entities: [],
    prompts: {
      moveHint: '方向键移动',
      interactHint: '空格交互',
      portalHint: '传送',
      combatHint: '战斗',
      itemHint: '收集',
      eventHint: '事件',
      lockedHint: '锁定',
      proximityHint: '靠近',
    },
    summary: {
      blockedTileCount: 0,
      portalCount: 0,
      npcCount: 0,
      interactionCount: 0,
    },
  });

const buildFallbackStage = () =>
  areaSceneStageModelSchema.parse({
    rendererLabel: '备用场景',
    backgroundLabel: '遗迹底板',
    engineTargets: ['phaser'],
    highlightSummary: '测试备用场景',
    stageTone: 'info',
    layers: [
      {
        id: 'layer:bg',
        label: '背景',
        detail: '背景层',
        kind: 'background',
        tiles: [
          {
            id: 'tile:bg',
            label: '背景',
            variant: 'stone',
            tone: 'info',
            animation: 'none',
            xPercent: 0,
            yPercent: 0,
            widthPercent: 100,
            heightPercent: 100,
          },
        ],
      },
      {
        id: 'layer:terrain',
        label: '地面',
        detail: '地面层',
        kind: 'terrain',
        tiles: [
          {
            id: 'tile:terrain',
            label: '地面',
            variant: 'stone',
            tone: 'default',
            animation: 'none',
            xPercent: 0,
            yPercent: 50,
            widthPercent: 100,
            heightPercent: 50,
          },
        ],
      },
      {
        id: 'layer:structure',
        label: '结构',
        detail: '结构层',
        kind: 'structures',
        tiles: [
          {
            id: 'tile:structure',
            label: '石柱',
            variant: 'wall',
            tone: 'warning',
            animation: 'none',
            xPercent: 30,
            yPercent: 20,
            widthPercent: 12,
            heightPercent: 30,
          },
        ],
      },
      {
        id: 'layer:highlight',
        label: '高亮',
        detail: '高亮层',
        kind: 'highlights',
        tiles: [
          {
            id: 'tile:highlight',
            label: '光晕',
            variant: 'glow',
            tone: 'success',
            animation: 'pulse',
            xPercent: 45,
            yPercent: 35,
            widthPercent: 10,
            heightPercent: 10,
          },
        ],
      },
    ],
    markers: [],
    legend: [
      {
        id: 'legend:1',
        label: '测试标记',
        tone: 'info',
      },
    ],
  });

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
};

const createRuntimeSpy = () => ({
  updateModel: vi.fn(),
  updateCallbacks: vi.fn(),
  setInteractionLocked: vi.fn(),
  resize: vi.fn(),
  destroy: vi.fn(),
});

describe('phaser area scene viewport', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
    }

    container?.remove();
    root = null;
    container = null;
  });

  it('enters ready state when runtime bootstrap succeeds', async () => {
    const runtime = createRuntimeSpy();
    const runtimeLoader = vi.fn(async () => ({
      createPhaserPixelSceneRuntime: vi.fn(async () => ({
        ...runtime,
      })),
    }));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader,
        }),
      );
    });

    await flushEffects();

    const scene = container.querySelector('.phaser-scene');
    expect(scene?.getAttribute('data-scene-state')).toBe('ready');
    expect(container.textContent).not.toContain('像素场景载入中');
    expect(container.textContent).not.toContain('像素场景加载失败');
    expect(runtimeLoader).toHaveBeenCalledTimes(1);

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: true,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader,
        }),
      );
    });

    expect(runtime.setInteractionLocked).toHaveBeenCalledWith(true);
  });

  it('falls back to the backup stage when runtime bootstrap fails', async () => {
    const runtimeLoader = vi.fn(async () => {
      throw new Error('bootstrap failed');
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader,
        }),
      );
    });

    await flushEffects();

    const scene = container.querySelector('.phaser-scene');
    expect(scene?.getAttribute('data-scene-state')).toBe('error');
    expect(container.textContent).toContain('像素场景加载失败');
    expect(container.querySelector('.phaser-scene__fallback')).not.toBeNull();
  });

  it('does not rebuild the runtime when only callback identities change', async () => {
    const runtime = createRuntimeSpy();
    const runtimeLoader = vi.fn(async () => ({
      createPhaserPixelSceneRuntime: vi.fn(async () => ({
        ...runtime,
      })),
    }));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader,
        }),
      );
    });

    await flushEffects();

    runtime.updateModel.mockClear();
    runtime.updateCallbacks.mockClear();
    runtime.setInteractionLocked.mockClear();

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader,
        }),
      );
    });

    expect(runtime.updateCallbacks).toHaveBeenCalledTimes(1);
    expect(runtime.setInteractionLocked).not.toHaveBeenCalled();
    expect(runtime.updateModel).not.toHaveBeenCalled();
  });

  it('does not remount the runtime when loader identity changes on the same area', async () => {
    const runtime = createRuntimeSpy();
    const firstLoader = vi.fn(async () => ({
      createPhaserPixelSceneRuntime: vi.fn(async () => ({
        ...runtime,
      })),
    }));
    const secondLoader = vi.fn(async () => ({
      createPhaserPixelSceneRuntime: vi.fn(async () => ({
        ...runtime,
      })),
    }));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader: firstLoader,
        }),
      );
    });

    await flushEffects();
    expect(firstLoader).toHaveBeenCalledTimes(1);

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader: secondLoader,
        }),
      );
    });

    expect(firstLoader).toHaveBeenCalledTimes(1);
    expect(secondLoader).not.toHaveBeenCalled();
  });

  it('updates the runtime model when scene data actually changes', async () => {
    const runtime = createRuntimeSpy();
    const runtimeLoader = vi.fn(async () => ({
      createPhaserPixelSceneRuntime: vi.fn(async () => ({
        ...runtime,
      })),
    }));
    const changedModel = pixelSceneRenderModelSchema.parse({
      ...buildRenderScene(),
      entities: [
        {
          id: 'npc:test',
          label: '测试角色',
          caption: '对话 / 信任',
          type: 'npc',
          targetId: 'npc:test',
          enabled: true,
          x: 4,
          y: 3,
          feedbackTone: 'success',
          autoInteractOnApproach: true,
          interactionRadius: 1.15,
        },
      ],
      summary: {
        blockedTileCount: 0,
        portalCount: 0,
        npcCount: 1,
        interactionCount: 1,
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: buildRenderScene(),
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader,
        }),
      );
    });

    await flushEffects();
    runtime.updateModel.mockClear();

    await act(async () => {
      root?.render(
        createElement(PhaserAreaSceneViewport, {
          model: changedModel,
          interactionLocked: false,
          fallbackStage: buildFallbackStage(),
          areaName: '测试区域',
          areaType: '遗迹',
          onNpcSelect: vi.fn(),
          onMarkerActivate: vi.fn(),
          runtimeLoader,
        }),
      );
    });

    expect(runtime.updateModel).toHaveBeenCalledTimes(1);
    expect(runtime.updateModel).toHaveBeenCalledWith(changedModel);
  });
});
