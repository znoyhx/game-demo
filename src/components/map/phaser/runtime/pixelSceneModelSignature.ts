import type { PixelSceneRenderModel } from '../pixelSceneRenderer.contract';

export const buildPixelSceneRenderModelSignature = (
  model: PixelSceneRenderModel,
) =>
  JSON.stringify({
    areaId: model.areaId,
    palette: model.palette,
    viewport: model.viewport,
    playerSpawn: model.playerSpawn,
    tiles: model.tiles,
    entities: model.entities,
    prompts: model.prompts,
  });
