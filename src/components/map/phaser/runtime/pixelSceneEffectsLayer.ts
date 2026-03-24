import Phaser from 'phaser';

import type { PixelSceneRenderModel } from '../pixelSceneRenderer.contract';
import {
  buildPixelSceneAmbientDescriptors,
  type PixelSceneAmbientDescriptor,
} from './pixelSceneArtPipeline';

export interface PixelSceneEffectHandle {
  destroy: () => void;
}

const colorByTone: Record<PixelSceneAmbientDescriptor['tone'], number> = {
  default: 0xd8e4f2,
  success: 0x79d99c,
  warning: 0xf4b860,
  info: 0x74d6ff,
};

const createRingEffect = (
  scene: Phaser.Scene,
  descriptor: PixelSceneAmbientDescriptor,
  tileSize: number,
) => {
  const color = colorByTone[descriptor.tone];
  const radius = tileSize * descriptor.radius;
  const ring = scene.add.circle(0, 0, radius, color, 0.08).setStrokeStyle(2, color, 0.72);
  const halo = scene.add.circle(0, 0, radius * 0.62, color, 0.14);
  const container = scene.add
    .container(descriptor.x * tileSize, descriptor.y * tileSize, [halo, ring])
    .setDepth(descriptor.depth);

  scene.tweens.add({
    targets: ring,
    scaleX: 1.18,
    scaleY: 1.18,
    alpha: 0.16,
    duration: descriptor.motionPreset === 'battleAlarm' ? 420 : 860,
    ease: 'Sine.easeOut',
    yoyo: true,
    repeat: -1,
  });
  scene.tweens.add({
    targets: halo,
    alpha: descriptor.motionPreset === 'battleAlarm' ? 0.28 : 0.18,
    duration: descriptor.motionPreset === 'battleAlarm' ? 340 : 760,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });

  return {
    destroy: () => container.destroy(true),
  };
};

const createTileEffect = (
  scene: Phaser.Scene,
  descriptor: PixelSceneAmbientDescriptor,
  tileSize: number,
) => {
  const color = colorByTone[descriptor.tone];
  const radius = tileSize * descriptor.radius;

  if (descriptor.motionPreset === 'waterShimmer') {
    const shimmer = scene.add.ellipse(0, 0, radius * 1.8, radius * 0.55, color, 0.14);
    const sparkle = scene.add.rectangle(0, -radius * 0.1, radius * 0.9, 2, 0xffffff, 0.38);
    const container = scene.add
      .container(descriptor.x * tileSize, descriptor.y * tileSize + tileSize * 0.12, [
        shimmer,
        sparkle,
      ])
      .setDepth(descriptor.depth);

    scene.tweens.add({
      targets: [shimmer, sparkle],
      alpha: 0.08,
      duration: 1400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    scene.tweens.add({
      targets: sparkle,
      x: radius * 0.24,
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    return {
      destroy: () => container.destroy(true),
    };
  }

  if (descriptor.motionPreset === 'foliageDrift') {
    const leaf = scene.add.rectangle(0, 0, radius * 0.85, radius * 0.38, color, 0.3);
    leaf.setAngle(26);
    const container = scene.add
      .container(descriptor.x * tileSize, descriptor.y * tileSize - tileSize * 0.08, [leaf])
      .setDepth(descriptor.depth);

    scene.tweens.add({
      targets: leaf,
      y: -radius * 0.42,
      x: radius * 0.18,
      angle: -12,
      alpha: 0.12,
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    return {
      destroy: () => container.destroy(true),
    };
  }

  const emberGlow = scene.add.circle(0, 0, radius, color, 0.18);
  const emberCore = scene.add.circle(0, 0, radius * 0.46, 0xffffff, 0.44);
  const container = scene.add
    .container(descriptor.x * tileSize, descriptor.y * tileSize - tileSize * 0.08, [
      emberGlow,
      emberCore,
    ])
    .setDepth(descriptor.depth);

  scene.tweens.add({
    targets: emberGlow,
    alpha: 0.06,
    scaleX: 1.24,
    scaleY: 1.24,
    duration: 520,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
  scene.tweens.add({
    targets: emberCore,
    alpha: 0.18,
    y: -radius * 0.12,
    duration: 320,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });

  return {
    destroy: () => container.destroy(true),
  };
};

const createEffect = (
  scene: Phaser.Scene,
  descriptor: PixelSceneAmbientDescriptor,
  tileSize: number,
) =>
  descriptor.anchor === 'entity'
    ? createRingEffect(scene, descriptor, tileSize)
    : createTileEffect(scene, descriptor, tileSize);

export const createPixelSceneEffectsLayer = (
  scene: Phaser.Scene,
  model: PixelSceneRenderModel,
): PixelSceneEffectHandle[] =>
  buildPixelSceneAmbientDescriptors(model).map((descriptor) =>
    createEffect(scene, descriptor, model.viewport.tileSize),
  );
