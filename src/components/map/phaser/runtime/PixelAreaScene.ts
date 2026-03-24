import Phaser from 'phaser';

import type {
  PixelSceneEntity,
  PixelSceneRenderModel,
  PixelSceneTile,
} from '../pixelSceneRenderer.contract';
import { createPixelSceneEntityLayer, type PixelSceneEntityHandle } from './pixelSceneEntityLayer';
import { createPixelSceneEffectsLayer, type PixelSceneEffectHandle } from './pixelSceneEffectsLayer';
import {
  getEntityAnimationKey,
  getEntityTextureKey,
  getTileTextureKey,
  resolveHumanoidAnimationName,
  resolvePixelSceneEntityArt,
} from './pixelSceneArtPipeline';
import { buildPixelSceneRenderModelSignature } from './pixelSceneModelSignature';
import { centerPixelSceneCameraSafely } from './pixelSceneRuntimeGuards';
import { ensurePixelSceneTextures } from './pixelSceneTextures';

export interface PixelScenePromptState {
  title: string;
  detail: string;
}

export type PixelSceneActivationSource = 'manual' | 'approach';

export interface PixelAreaSceneCallbacks {
  onNpcSelect: (npcId: string) => void;
  onMarkerActivate: (markerId: string, source?: PixelSceneActivationSource) => void;
  onPromptChange: (prompt: PixelScenePromptState | null) => void;
}

export class PixelAreaScene extends Phaser.Scene {
  private model: PixelSceneRenderModel;

  private modelSignature: string;

  private callbacks: PixelAreaSceneCallbacks;

  private interactionLocked: boolean;

  private groundLayer?: Phaser.GameObjects.Container;

  private overlayLayer?: Phaser.GameObjects.Container;

  private promptBubble?: Phaser.GameObjects.Container;

  private promptBubbleBackground?: Phaser.GameObjects.Rectangle;

  private promptBubbleTitle?: Phaser.GameObjects.Text;

  private promptBubbleDetail?: Phaser.GameObjects.Text;

  private playerShadow?: Phaser.GameObjects.Ellipse;

  private player?: Phaser.Physics.Arcade.Sprite;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private keyW?: Phaser.Input.Keyboard.Key;

  private keyA?: Phaser.Input.Keyboard.Key;

  private keyS?: Phaser.Input.Keyboard.Key;

  private keyD?: Phaser.Input.Keyboard.Key;

  private keySpace?: Phaser.Input.Keyboard.Key;

  private collisionBodies: Phaser.Physics.Arcade.Image[] = [];

  private entityHandles: PixelSceneEntityHandle[] = [];

  private effectHandles: PixelSceneEffectHandle[] = [];

  private activePromptId: string | null = null;

  private activeFocusId: string | null = null;

  private approachLatch = new Set<string>();

  private lastPortalAt = 0;

  private sceneReady = false;

  private playerFacing: 'down' | 'side' | 'up' = 'down';

  private playerFacingLeft = false;

  private playerBaseScale = 1;

  constructor(options: {
    model: PixelSceneRenderModel;
    callbacks: PixelAreaSceneCallbacks;
    interactionLocked: boolean;
  }) {
    super({ key: 'pixelforge-area-scene' });
    this.model = options.model;
    this.modelSignature = buildPixelSceneRenderModelSignature(options.model);
    this.callbacks = options.callbacks;
    this.interactionLocked = options.interactionLocked;
  }

  create() {
    this.cameras.main.setBackgroundColor('#08111b');
    this.cameras.main.roundPixels = true;
    this.input.setTopOnly(false);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyW = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.buildScene();
    this.sceneReady = true;
  }

  public applyModel(model: PixelSceneRenderModel) {
    const nextSignature = buildPixelSceneRenderModelSignature(model);
    const shouldRebuild = nextSignature !== this.modelSignature;
    this.model = model;
    this.modelSignature = nextSignature;
    if (this.sceneReady && shouldRebuild) {
      this.buildScene();
    }
  }

  public updateCallbacks(callbacks: PixelAreaSceneCallbacks) {
    this.callbacks = callbacks;
  }

  public setInteractionLocked(locked: boolean) {
    this.interactionLocked = locked;
    if (locked) {
      this.clearPrompt();
      if (this.player?.body) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
      }
    }
  }

  public handleResize() {
    centerPixelSceneCameraSafely(
      this.cameras?.main,
      this.player?.x ?? this.model.playerSpawn.x * this.model.viewport.tileSize,
      this.player?.y ?? this.model.playerSpawn.y * this.model.viewport.tileSize,
    );
  }

  update() {
    if (!this.player || !this.player.body) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.interactionLocked) {
      this.updatePlayerPresentation(0, 0);
      body.setVelocity(0, 0);
      return;
    }

    const speed = 94;
    const horizontal =
      (this.cursors?.left.isDown || this.keyA?.isDown ? -1 : 0) +
      (this.cursors?.right.isDown || this.keyD?.isDown ? 1 : 0);
    const vertical =
      (this.cursors?.up.isDown || this.keyW?.isDown ? -1 : 0) +
      (this.cursors?.down.isDown || this.keyS?.isDown ? 1 : 0);

    body.setVelocity(0, 0);

    if (horizontal !== 0 || vertical !== 0) {
      const vector = new Phaser.Math.Vector2(horizontal, vertical).normalize().scale(speed);
      body.setVelocity(vector.x, vector.y);
    }

    this.updatePlayerPresentation(horizontal, vertical);
    this.updatePromptState();

    if (this.keySpace && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      const focusedEntity = this.entityHandles.find(
        (handle) => handle.entity.id === this.activePromptId,
      );
      if (focusedEntity) {
        this.activateEntity(focusedEntity.entity, 'manual');
      }
    }
  }

  private buildScene() {
    this.callbacks.onPromptChange(null);
    this.activePromptId = null;
    this.activeFocusId = null;
    this.approachLatch.clear();
    this.lastPortalAt = 0;

    this.collisionBodies.forEach((body) => body.destroy());
    this.entityHandles.forEach((handle) => handle.destroy());
    this.effectHandles.forEach((handle) => handle.destroy());
    this.groundLayer?.destroy(true);
    this.overlayLayer?.destroy(true);
    this.promptBubble?.destroy(true);
    this.playerShadow?.destroy(true);
    this.player?.destroy(true);

    this.collisionBodies = [];
    this.entityHandles = [];
    this.effectHandles = [];
    this.promptBubble = undefined;
    this.promptBubbleBackground = undefined;
    this.promptBubbleTitle = undefined;
    this.promptBubbleDetail = undefined;
    this.playerShadow = undefined;
    this.playerFacing = 'down';
    this.playerFacingLeft = false;
    this.playerBaseScale = 1;

    const { tileSize, widthTiles, heightTiles, cameraZoom } = this.model.viewport;
    ensurePixelSceneTextures(this, this.model.palette, tileSize);

    this.physics.world.setBounds(0, 0, widthTiles * tileSize, heightTiles * tileSize);
    this.cameras.main.setBounds(0, 0, widthTiles * tileSize, heightTiles * tileSize);
    this.cameras.main.setZoom(cameraZoom);

    this.groundLayer = this.add.container(0, 0);
    this.overlayLayer = this.add.container(0, 0);

    for (const tile of this.model.tiles) {
      this.renderTile(tile);
    }

    const spawnX = this.model.playerSpawn.x * tileSize + tileSize / 2;
    const spawnY = this.model.playerSpawn.y * tileSize + tileSize / 2;
    const playerArt = resolvePixelSceneEntityArt(this.model.palette, 'player');
    this.playerShadow = this.add
      .ellipse(spawnX, spawnY + tileSize * 0.28, tileSize * 0.5, tileSize * 0.18, 0x000000, 0.26)
      .setDepth(spawnY + tileSize - 2);
    this.player = this.physics.add
      .sprite(spawnX, spawnY, getEntityTextureKey(this.model.palette, 'player'))
      .setDepth(spawnY + tileSize)
      .setCollideWorldBounds(true);
    this.playerBaseScale = playerArt.baseScale;
    this.player.setScale(this.playerBaseScale);
    this.player.setSize(tileSize * 0.48, tileSize * 0.56);
    this.player.setOffset(tileSize * 0.26, tileSize * 0.24);
    this.player.play(
      getEntityAnimationKey(
        this.model.palette,
        'player',
        playerArt.defaultAnimation,
      ),
    );

    this.entityHandles = createPixelSceneEntityLayer(
      this,
      this.model.palette,
      tileSize,
      this.model.entities,
      (entity) => {
        this.activateEntity(entity, 'manual');
      },
    );

    this.effectHandles = createPixelSceneEffectsLayer(this, this.model);
    this.createPromptBubble();
    this.physics.add.collider(this.player, this.collisionBodies);
    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
    this.handleResize();
  }

  private createPromptBubble() {
    this.promptBubbleBackground = this.add
      .rectangle(0, 0, 148, 36, 0x08111b, 0.96)
      .setStrokeStyle(1, 0xd8e4f2, 0.45);
    this.promptBubbleTitle = this.add
      .text(0, 0, '', {
        color: '#f7fbff',
        fontFamily: 'monospace',
        fontSize: '11px',
      })
      .setOrigin(0, 0);
    this.promptBubbleDetail = this.add
      .text(0, 0, '', {
        color: '#9fc3dd',
        fontFamily: 'monospace',
        fontSize: '9px',
        wordWrap: {
          width: 132,
        },
      })
      .setOrigin(0, 0);
    this.promptBubble = this.add
      .container(0, 0, [
        this.promptBubbleBackground,
        this.promptBubbleTitle,
        this.promptBubbleDetail,
      ])
      .setDepth(9999)
      .setVisible(false);
  }

  private renderTile(tile: PixelSceneTile) {
    const { tileSize } = this.model.viewport;
    const targetLayer = tile.layer === 'ground' ? this.groundLayer : this.overlayLayer;
    const image = this.add
      .image(tile.x * tileSize, tile.y * tileSize, getTileTextureKey(this.model.palette, tile.kind))
      .setOrigin(0)
      .setDepth(tile.layer === 'ground' ? tile.y : tile.y * 20)
      .setPipeline('TextureTintPipeline');

    targetLayer?.add(image);

    if (tile.blocked) {
      const blocker = this.physics.add
        .staticImage(
          tile.x * tileSize + tileSize / 2,
          tile.y * tileSize + tileSize / 2,
          getTileTextureKey(this.model.palette, tile.kind),
        )
        .setVisible(false);
      blocker.body.setSize(tileSize, tileSize);
      blocker.refreshBody();
      this.collisionBodies.push(blocker);
    }
  }

  private updatePromptState() {
    if (!this.player) {
      return;
    }

    const playerTilePosition = {
      x: this.player.x / this.model.viewport.tileSize,
      y: this.player.y / this.model.viewport.tileSize,
    };

    const nearest = this.entityHandles
      .filter((handle) => handle.entity.enabled)
      .map((handle) => {
        const distance = Phaser.Math.Distance.Between(
          playerTilePosition.x,
          playerTilePosition.y,
          handle.entity.x + 0.5,
          handle.entity.y + 0.5,
        );
        return {
          handle,
          distance,
        };
      })
      .filter(({ handle, distance }) => distance <= handle.entity.interactionRadius)
      .sort((left, right) => left.distance - right.distance)[0];

    if (!nearest) {
      this.entityHandles.forEach((handle) => handle.setFocused(false));
      this.clearPrompt();
      return;
    }

    const { entity } = nearest.handle;
    this.entityHandles.forEach((handle) => {
      handle.setFocused(handle.entity.id === entity.id);
    });

    if (this.activeFocusId !== entity.id) {
      this.activeFocusId = entity.id;
      this.callbacks.onPromptChange({
        title: entity.label,
        detail: this.promptDetailFor(entity),
      });
    }

    this.updatePromptBubble(nearest.handle);
    this.activePromptId = entity.id;

    if (entity.autoInteractOnApproach && !this.approachLatch.has(entity.id)) {
      this.approachLatch.add(entity.id);
      this.activateEntity(entity, 'approach');
      return;
    }

    if (!entity.autoInteractOnApproach) {
      this.approachLatch.delete(entity.id);
    }
  }

  private updatePlayerPresentation(horizontal: number, vertical: number) {
    if (!this.player) {
      return;
    }

    const tileSize = this.model.viewport.tileSize;
    const moving = horizontal !== 0 || vertical !== 0;
    const cycle = this.time.now / 92;
    const squash = moving ? Math.sin(cycle) * 0.05 : 0;

    if (Math.abs(horizontal) > Math.abs(vertical) && horizontal !== 0) {
      this.playerFacing = 'side';
      this.playerFacingLeft = horizontal < 0;
    } else if (vertical < 0) {
      this.playerFacing = 'up';
    } else if (vertical > 0) {
      this.playerFacing = 'down';
    }

    const animationKey = getEntityAnimationKey(
      this.model.palette,
      'player',
      resolveHumanoidAnimationName(moving, this.playerFacing),
    );
    if (this.player.anims.currentAnim?.key !== animationKey) {
      this.player.play(animationKey, true);
    }

    this.player.setFlipX(this.playerFacing === 'side' && this.playerFacingLeft);
    this.player.setScale(
      this.playerBaseScale * (1 + squash),
      this.playerBaseScale * (1 - squash * 0.68),
    );
    this.player.setAngle(horizontal === 0 ? 0 : horizontal * 2.2);
    this.player.setDepth(this.player.y + tileSize);

    if (this.playerShadow) {
      const shadowDrift = moving ? Math.abs(Math.sin(cycle)) * 0.16 : 0;
      this.playerShadow.setPosition(this.player.x, this.player.y + tileSize * 0.28);
      this.playerShadow.setScale(1 + shadowDrift, 1 - shadowDrift * 0.42);
      this.playerShadow.setDepth(this.player.y + tileSize - 2);
    }
  }

  private clearPrompt() {
    if (this.activePromptId || this.activeFocusId) {
      this.callbacks.onPromptChange(null);
    }
    this.promptBubble?.setVisible(false);
    this.activePromptId = null;
    this.activeFocusId = null;
  }

  private updatePromptBubble(handle: PixelSceneEntityHandle) {
    if (
      !this.promptBubble ||
      !this.promptBubbleBackground ||
      !this.promptBubbleTitle ||
      !this.promptBubbleDetail
    ) {
      return;
    }

    const detail = this.promptDetailFor(handle.entity);
    const maxWidth = this.model.viewport.tileSize * 7.6;
    this.promptBubbleTitle.setText(handle.entity.label);
    this.promptBubbleDetail.setWordWrapWidth(maxWidth - 16);
    this.promptBubbleDetail.setText(detail);

    const contentWidth = Math.max(
      this.promptBubbleTitle.width,
      this.promptBubbleDetail.width,
      96,
    );
    const contentHeight =
      this.promptBubbleTitle.height + this.promptBubbleDetail.height + 10;
    const bubbleWidth = contentWidth + 16;
    const bubbleHeight = contentHeight + 12;

    this.promptBubbleBackground.setSize(bubbleWidth, bubbleHeight);
    this.promptBubbleTitle.setPosition(-bubbleWidth / 2 + 8, -bubbleHeight / 2 + 5);
    this.promptBubbleDetail.setPosition(-bubbleWidth / 2 + 8, -bubbleHeight / 2 + 18);

    const aboveY = handle.container.y - this.model.viewport.tileSize - 18;
    const bubbleY =
      aboveY > this.model.viewport.tileSize
        ? aboveY
        : handle.container.y + this.model.viewport.tileSize + 12;

    this.promptBubble
      .setPosition(handle.container.x, bubbleY)
      .setVisible(true);
  }

  private promptDetailFor(entity: PixelSceneEntity) {
    switch (entity.type) {
      case 'npc':
      case 'shop':
        return `${this.model.prompts.proximityHint} · ${entity.caption}`;
      case 'portal':
        return `${this.model.prompts.portalHint} · ${entity.caption}`;
      case 'battle':
        return `${this.model.prompts.combatHint} · ${entity.caption}`;
      case 'item':
        return `${this.model.prompts.itemHint} · ${entity.caption}`;
      case 'event':
      default:
        return `${this.model.prompts.eventHint} · ${entity.caption}`;
    }
  }

  private activateEntity(
    entity: PixelSceneEntity,
    source: PixelSceneActivationSource = 'manual',
  ) {
    if (this.interactionLocked || !entity.enabled) {
      return;
    }

    if (entity.type === 'npc' || entity.type === 'shop') {
      if (entity.targetId) {
        this.callbacks.onNpcSelect(entity.targetId);
      }
      return;
    }

    if (entity.type === 'portal') {
      const now = this.time.now;
      if (now - this.lastPortalAt < 650) {
        return;
      }
      this.lastPortalAt = now;
    }

    this.callbacks.onMarkerActivate(entity.id, source);
  }
}
