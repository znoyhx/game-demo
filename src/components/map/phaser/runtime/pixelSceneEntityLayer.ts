import Phaser from 'phaser';

import type {
  PixelSceneEntity,
  PixelScenePalette,
} from '../pixelSceneRenderer.contract';
import {
  getEntityAnimationKey,
  resolveHumanoidAnimationName,
  resolvePixelSceneEntityArt,
} from './pixelSceneArtPipeline';

export interface PixelSceneEntityHandle {
  entity: PixelSceneEntity;
  container: Phaser.GameObjects.Container;
  setFocused: (focused: boolean) => void;
  destroy: () => void;
}

export const createPixelSceneEntityLayer = (
  scene: Phaser.Scene,
  palette: PixelScenePalette,
  tileSize: number,
  entities: PixelSceneEntity[],
  onActivate: (entity: PixelSceneEntity) => void,
): PixelSceneEntityHandle[] =>
  entities.map((entity) => {
    const art = resolvePixelSceneEntityArt(palette, entity.type);
    const facingSeed = (entity.x + entity.y) % 3;
    const facing =
      facingSeed === 0 ? 'down' : facingSeed === 1 ? 'side' : 'up';
    const x = entity.x * tileSize + tileSize / 2;
    const y = entity.y * tileSize + tileSize / 2;
    const container = scene.add.container(x, y);
    const sprite = scene.add
      .sprite(0, 0, art.textureKey)
      .setScale(art.baseScale)
      .setDepth(entity.y * 20 + 10);
    const badge = scene.add
      .rectangle(0, -tileSize / 2 - 4, tileSize - 4, 8, 0x0b1420, 0.9)
      .setStrokeStyle(1, 0xd8e4f2, 0.22);
    const dot = scene.add
      .circle(
        -tileSize / 3,
        -tileSize / 2 - 4,
        2,
        entity.feedbackTone === 'warning'
          ? 0xf4b860
          : entity.feedbackTone === 'success'
            ? 0x79d99c
            : entity.feedbackTone === 'danger'
              ? 0xff8686
              : 0x74d6ff,
      )
      .setDepth(entity.y * 20 + 13);

    container.add([badge, sprite, dot]);
    container.setSize(tileSize, tileSize);
    container.setDepth(entity.y * 20 + 12);
    container.setAlpha(entity.enabled ? 1 : 0.48);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-tileSize / 2, -tileSize / 2, tileSize, tileSize),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => {
      if (entity.enabled) {
        onActivate(entity);
      }
    });

    if (art.animationFamily === 'humanoid') {
      sprite.setFlipX(
        facing === 'side' && (entity.x * 31 + entity.y * 17) % 2 === 0,
      );
      sprite.play(
        getEntityAnimationKey(
          palette,
          entity.type,
          resolveHumanoidAnimationName(false, facing),
        ),
      );
    } else {
      sprite.play(
        getEntityAnimationKey(palette, entity.type, art.defaultAnimation),
      );
    }

    if (
      art.motionPreset === 'eventPulse' ||
      art.motionPreset === 'battleAlarm' ||
      art.motionPreset === 'portalPulse'
    ) {
      scene.tweens.add({
        targets: sprite,
        y: art.motionPreset === 'portalPulse' ? -2 : -1,
        duration: art.motionPreset === 'battleAlarm' ? 520 : 920,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }

    return {
      entity,
      container,
      setFocused: (focused: boolean) => {
        sprite.setScale(focused ? art.focusScale : art.baseScale);
        badge.setFillStyle(focused ? 0x13283d : 0x0b1420, focused ? 1 : 0.9);
        badge.setStrokeStyle(1, focused ? 0xf4d27a : 0xd8e4f2, focused ? 0.55 : 0.22);
      },
      destroy: () => {
        container.destroy(true);
      },
    };
  });
