import { z } from 'zod';

const pixelToneSchema = z.enum([
  'default',
  'success',
  'warning',
  'info',
  'danger',
]);

const tileAnimationSchema = z.enum(['none', 'pulse', 'float', 'shimmer', 'flicker']);

export const areaSceneTileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  variant: z.string().min(1),
  tone: pixelToneSchema,
  animation: tileAnimationSchema,
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(1).max(100),
  heightPercent: z.number().min(1).max(100),
});

export const areaSceneLayerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
  kind: z.enum(['background', 'terrain', 'structures', 'highlights']),
  tiles: z.array(areaSceneTileSchema),
});

export const areaSceneMarkerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  caption: z.string().min(1),
  glyph: z.string().min(1).max(3),
  typeLabel: z.string().min(1),
  type: z.enum(['npc', 'item', 'portal', 'event', 'shop', 'battle']),
  targetId: z.string().min(1).optional(),
  enabled: z.boolean(),
  mapX: z.number().int().min(0).optional(),
  mapY: z.number().int().min(0).optional(),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  feedbackTone: pixelToneSchema,
  state: z.enum(['idle', 'focus', 'alert', 'disabled']),
});

export const areaSceneLegendItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tone: pixelToneSchema,
});

export const areaSceneStageModelSchema = z.object({
  rendererLabel: z.string().min(1),
  backgroundLabel: z.string().min(1),
  engineTargets: z.array(z.string().min(1)).min(1),
  highlightSummary: z.string().min(1),
  stageTone: pixelToneSchema,
  layers: z.array(areaSceneLayerSchema).min(4),
  markers: z.array(areaSceneMarkerSchema),
  legend: z.array(areaSceneLegendItemSchema).min(1),
});

export type AreaSceneTile = z.infer<typeof areaSceneTileSchema>;
export type AreaSceneLayer = z.infer<typeof areaSceneLayerSchema>;
export type AreaSceneMarker = z.infer<typeof areaSceneMarkerSchema>;
export type AreaSceneLegendItem = z.infer<typeof areaSceneLegendItemSchema>;
export type AreaSceneStageModel = z.infer<typeof areaSceneStageModelSchema>;
