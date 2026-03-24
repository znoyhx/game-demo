import type { PixelSceneRenderModel } from '../pixelSceneRenderer.contract';
import type { PixelAreaSceneCallbacks } from './PixelAreaScene';

export interface PhaserPixelSceneRuntime {
  updateModel: (model: PixelSceneRenderModel) => void;
  updateCallbacks: (callbacks: PixelAreaSceneCallbacks) => void;
  setInteractionLocked: (interactionLocked: boolean) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
}

export async function createPhaserPixelSceneRuntime(options: {
  host: HTMLElement;
  model: PixelSceneRenderModel;
  interactionLocked: boolean;
  callbacks: PixelAreaSceneCallbacks;
}): Promise<PhaserPixelSceneRuntime> {
  const [{ default: Phaser }, { PixelAreaScene }] = await Promise.all([
    import('phaser'),
    import('./PixelAreaScene'),
  ]);

  const scene = new PixelAreaScene({
    model: options.model,
    callbacks: options.callbacks,
    interactionLocked: options.interactionLocked,
  });
  const initialWidth = Math.max(640, options.host.clientWidth || 0);
  const initialHeight = Math.max(420, options.host.clientHeight || 0);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.host,
    backgroundColor: '#08111b',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width: initialWidth,
      height: initialHeight,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene,
  });

  const canvas = options.host.querySelector('canvas');
  if (canvas instanceof HTMLCanvasElement) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    canvas.setAttribute('data-renderer', 'phaser');
  }

  return {
    updateModel: (model) => {
      scene.applyModel(model);
    },
    updateCallbacks: (callbacks) => {
      scene.updateCallbacks(callbacks);
    },
    setInteractionLocked: (interactionLocked) => {
      scene.setInteractionLocked(interactionLocked);
    },
    resize: (width, height) => {
      const nextWidth = Math.max(320, Math.round(width));
      const nextHeight = Math.max(240, Math.round(height));
      game.scale.resize(nextWidth, nextHeight);
      scene.handleResize();

      const sceneCanvas = options.host.querySelector('canvas');
      if (sceneCanvas instanceof HTMLCanvasElement) {
        sceneCanvas.style.width = '100%';
        sceneCanvas.style.height = '100%';
        sceneCanvas.style.imageRendering = 'pixelated';
      }
    },
    destroy: () => {
      game.destroy(true);
    },
  };
}
