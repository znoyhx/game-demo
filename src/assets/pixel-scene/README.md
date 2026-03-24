# 像素场景美术接入说明

当前 Phaser 主场景默认使用运行时生成的占位像素纹理。

目标是保证：

- 主玩法已经是完整 2D 像素场景
- 正式美术资源可以后续替换
- 替换资源时不需要修改控制器、规则、状态或存档结构

## 当前入口

渲染侧的占位美术与动画预设集中在：

- `src/assets/pixel-scene/generatedSpriteSheets.ts`
- `src/components/map/phaser/runtime/pixelSceneArtPipeline.ts`
- `src/components/map/phaser/runtime/pixelSceneTextures.ts`
- `src/components/map/phaser/runtime/pixelSceneSpriteSheets.ts`
- `src/components/map/phaser/runtime/pixelSceneEffectsLayer.ts`

其中：

- `generatedSpriteSheets.ts` 定义纯数据化的内置像素帧与动画编排
- `pixelSceneArtPipeline.ts` 定义地块 / 实体的纹理键、运动预设、特效描述
- `pixelSceneTextures.ts` 负责地块纹理生成，并触发实体 spritesheet 注册
- `pixelSceneSpriteSheets.ts` 负责把纯数据帧渲染为 Phaser 可播放的 spritesheet 与动画
- `pixelSceneEffectsLayer.ts` 负责水面、余烬、传送门、事件点、战斗点的环境特效

## 后续替换正式资源的步骤

1. 准备 atlas 或 spritesheet，按地块与实体分类导出
2. 在 `pixelSceneArtPipeline.ts` 中把对应条目的 `source.kind` 从 `generated` 改为 `atlas`
3. 保留 `animationFamily` / `defaultAnimation` 这层抽象，让正式资源继续沿用相同动画语义
4. 在 Phaser 运行时补充 atlas 预加载逻辑，并替换 `pixelSceneSpriteSheets.ts` 的生成注册分支
5. 保留现有 `motionPreset`，让正式资源继续复用同一套交互反馈与特效节奏

## 推荐资源拆分

- 地块：`grass`、`path`、`stone`、`water`、`foliage`、`wall`、`ember`
- 实体：`player`、`npc`、`shop`、`portal`、`event`、`battle`、`item`
- 可选动画：玩家行走帧、NPC 待机帧、传送门循环帧、事件脉冲帧、战斗警示帧

## 当前内置资源策略

- 不依赖外部美术文件
- 使用 `generatedSpriteSheets.ts` 里的纯数据像素帧
- 运行时按区域调色板重新着色
- `player` / `npc` / `shop` 共享 humanoid 动画族，便于后续整体替换
- `portal` / `event` / `battle` / `item` 各自保留独立动画族，便于后续单独升级

## 不应改变的边界

- 不要把美术资源选择写进控制器
- 不要让状态层依赖具体纹理文件名
- 不要把资源路径直接塞进存档
- 不要在 React 页面组件里拼装 Phaser 资源规则

正式资源只应替换渲染层入口，不应改变领域层契约。
