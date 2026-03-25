import { z } from 'zod';

import {
  areaIdSchema,
  encounterIdSchema,
  eventIdSchema,
  finiteNumberSchema,
  genericIdSchema,
  itemIdSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  npcIdSchema,
  questIdSchema,
} from './shared';
import { areaSceneDefinitionSchema } from './areaScene.schema';

export const areaTypeSchema = z.enum([
  'town',
  'wilderness',
  'dungeon',
  'ruin',
  'shop',
  'boss',
  'hidden',
]);

export const interactionTravelModeSchema = z.enum(['walk', 'teleport']);

export const interactionPointTypeSchema = z.enum(['npc', 'item', 'portal', 'event', 'shop', 'battle']);

export const interactionPointSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    type: interactionPointTypeSchema,
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    targetId: nonEmptyStringSchema.optional(),
    resourceNodeId: genericIdSchema.optional(),
    enabled: z.boolean().optional(),
    travelMode: interactionTravelModeSchema.optional(),
  })
  .strict();

export const areaEnterConditionSchema = z
  .object({
    requiredQuestIds: z.array(questIdSchema).optional(),
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
    requiredNpcTrust: z
      .array(
        z
          .object({
            npcId: npcIdSchema,
            minTrust: z.number().min(0).max(100),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const areaUnlockConditionSchema = areaEnterConditionSchema;

export const enemySpawnTriggerSchema = z.enum([
  'always',
  'on-enter',
  'on-search',
  'on-event',
  'on-alert',
]);

export const enemySpawnRuleSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    trigger: enemySpawnTriggerSchema,
    encounterId: encounterIdSchema.optional(),
    enemyNpcId: npcIdSchema.optional(),
    enemyArchetype: nonEmptyStringSchema.optional(),
    spawnWeight: positiveIntegerSchema,
    maxActive: positiveIntegerSchema,
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
    blockedWorldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const resourceNodeKindSchema = z.enum([
  'supply',
  'ore',
  'herb',
  'relic',
  'ember',
  'cache',
]);

export const resourceNodeSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    kind: resourceNodeKindSchema,
    itemId: itemIdSchema.optional(),
    quantity: nonNegativeIntegerSchema,
    renewable: z.boolean(),
    discoveredByDefault: z.boolean(),
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const areaEnvironmentHazardSchema = z.enum(['stable', 'tense', 'volatile']);

export const areaEnvironmentActivationSchema = z
  .object({
    requiredWorldFlags: z.array(nonEmptyStringSchema).optional(),
    blockedWorldFlags: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const areaEnvironmentStateSchema = z
  .object({
    id: genericIdSchema,
    label: nonEmptyStringSchema,
    weather: nonEmptyStringSchema.optional(),
    lighting: nonEmptyStringSchema.optional(),
    hazard: areaEnvironmentHazardSchema,
    note: nonEmptyStringSchema.optional(),
    activation: areaEnvironmentActivationSchema.optional(),
  })
  .strict();

export const areaEnvironmentSchema = z
  .object({
    activeStateId: genericIdSchema.optional(),
    states: z.array(areaEnvironmentStateSchema).min(1),
  })
  .strict();

const areaSchemaBase = z
  .object({
    id: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    type: areaTypeSchema,
    description: nonEmptyStringSchema,
    difficulty: nonNegativeIntegerSchema,
    unlockedByDefault: z.boolean(),
    isHiddenUntilDiscovered: z.boolean().optional(),
    enterCondition: areaEnterConditionSchema.optional(),
    unlockCondition: areaUnlockConditionSchema.optional(),
    npcIds: z.array(npcIdSchema),
    interactionPoints: z.array(interactionPointSchema),
    enemySpawnRules: z.array(enemySpawnRuleSchema),
    eventIds: z.array(eventIdSchema),
    resourceNodes: z.array(resourceNodeSchema),
    environment: areaEnvironmentSchema,
    connectedAreaIds: z.array(nonEmptyStringSchema),
    backgroundKey: nonEmptyStringSchema.optional(),
    musicKey: nonEmptyStringSchema.optional(),
    scene: areaSceneDefinitionSchema,
  })
  .strict();

export const legacyAreaSchema = areaSchemaBase.omit({
  scene: true,
});

export const areaSchema = areaSchemaBase.superRefine((area, ctx) => {
  const pointIds = new Set(area.interactionPoints.map((point) => point.id));
  const npcIds = new Set(area.npcIds);
  const npcSpawnById = new Map(
    area.scene.npcSpawns.map((spawn) => [spawn.npcId, spawn]),
  );
  const interactionSpawnById = new Map(
    area.scene.interactionSpawns.map((spawn) => [spawn.interactionId, spawn]),
  );
  const portalSpawnById = new Map(
    area.scene.portalSpawns.map((spawn) => [spawn.interactionId, spawn]),
  );

  area.npcIds.forEach((npcId, index) => {
    if (!npcSpawnById.has(npcId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scene', 'npcSpawns'],
        message: `missing NPC spawn for "${npcId}" at npcIds[${index}]`,
      });
    }
  });

  area.scene.npcSpawns.forEach((spawn, index) => {
    if (!npcIds.has(spawn.npcId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scene', 'npcSpawns', index, 'npcId'],
        message: `scene NPC spawn "${spawn.npcId}" does not belong to area.npcIds`,
      });
    }
  });

  area.interactionPoints.forEach((point, index) => {
    if (point.type === 'npc' || point.type === 'shop') {
      if (!point.targetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['interactionPoints', index, 'targetId'],
          message: 'npc/shop interaction points require a targetId',
        });
        return;
      }

      const spawn = npcSpawnById.get(point.targetId);
      if (!spawn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scene', 'npcSpawns'],
          message: `missing scene NPC spawn for interaction target "${point.targetId}"`,
        });
        return;
      }

      if (spawn.x !== point.x || spawn.y !== point.y) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scene', 'npcSpawns'],
          message: `scene NPC spawn for "${point.targetId}" must match interaction point coordinates`,
        });
      }

      return;
    }

    if (point.type === 'portal') {
      const spawn = portalSpawnById.get(point.id);
      if (!spawn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scene', 'portalSpawns'],
          message: `missing portal scene spawn for "${point.id}"`,
        });
        return;
      }

      if (spawn.x !== point.x || spawn.y !== point.y) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scene', 'portalSpawns'],
          message: `portal scene spawn "${point.id}" must match interaction point coordinates`,
        });
      }

      if (point.targetId && spawn.targetAreaId !== point.targetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scene', 'portalSpawns'],
          message: `portal scene spawn "${point.id}" must match interaction target`,
        });
      }

      if (point.travelMode && spawn.travelMode !== point.travelMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scene', 'portalSpawns'],
          message: `portal scene spawn "${point.id}" must match travel mode`,
        });
      }

      return;
    }

    const spawn = interactionSpawnById.get(point.id);
    if (!spawn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scene', 'interactionSpawns'],
        message: `missing interaction scene spawn for "${point.id}"`,
      });
      return;
    }

    if (spawn.x !== point.x || spawn.y !== point.y) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scene', 'interactionSpawns'],
        message: `interaction scene spawn "${point.id}" must match interaction point coordinates`,
      });
    }
  });

  area.scene.interactionSpawns.forEach((spawn, index) => {
    if (!pointIds.has(spawn.interactionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scene', 'interactionSpawns', index, 'interactionId'],
        message: `scene interaction spawn "${spawn.interactionId}" does not exist in interactionPoints`,
      });
    }
  });

  area.scene.portalSpawns.forEach((spawn, index) => {
    const point = area.interactionPoints.find(
      (interactionPoint) => interactionPoint.id === spawn.interactionId,
    );

    if (!point) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scene', 'portalSpawns', index, 'interactionId'],
        message: `scene portal spawn "${spawn.interactionId}" does not exist in interactionPoints`,
      });
      return;
    }

    if (point.type !== 'portal') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scene', 'portalSpawns', index, 'interactionId'],
        message: `scene portal spawn "${spawn.interactionId}" must reference a portal interaction point`,
      });
    }
  });

  area.interactionPoints.forEach((point, index) => {
    if (point.type !== 'item' || !point.resourceNodeId) {
      return;
    }

    const resourceNodeExists = area.resourceNodes.some(
      (resourceNode) => resourceNode.id === point.resourceNodeId,
    );

    if (!resourceNodeExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['interactionPoints', index, 'resourceNodeId'],
        message: `item interaction "${point.id}" references missing resource node "${point.resourceNodeId}"`,
      });
    }
  });
});

export const mapStateSchema = z
  .object({
    currentAreaId: areaIdSchema,
    discoveredAreaIds: z.array(areaIdSchema),
    unlockedAreaIds: z.array(areaIdSchema),
    visitHistory: z.array(areaIdSchema),
  })
  .strict();

export type AreaType = z.infer<typeof areaTypeSchema>;
export type InteractionTravelMode = z.infer<typeof interactionTravelModeSchema>;
export type InteractionPointType = z.infer<typeof interactionPointTypeSchema>;
export type InteractionPoint = z.infer<typeof interactionPointSchema>;
export type AreaEnterCondition = z.infer<typeof areaEnterConditionSchema>;
export type AreaUnlockCondition = z.infer<typeof areaUnlockConditionSchema>;
export type EnemySpawnTrigger = z.infer<typeof enemySpawnTriggerSchema>;
export type EnemySpawnRule = z.infer<typeof enemySpawnRuleSchema>;
export type ResourceNodeKind = z.infer<typeof resourceNodeKindSchema>;
export type ResourceNode = z.infer<typeof resourceNodeSchema>;
export type AreaEnvironmentHazard = z.infer<typeof areaEnvironmentHazardSchema>;
export type AreaEnvironmentActivation = z.infer<typeof areaEnvironmentActivationSchema>;
export type AreaEnvironmentState = z.infer<typeof areaEnvironmentStateSchema>;
export type AreaEnvironment = z.infer<typeof areaEnvironmentSchema>;
export type LegacyArea = z.infer<typeof legacyAreaSchema>;
export type Area = z.infer<typeof areaSchema>;
export type MapState = z.infer<typeof mapStateSchema>;
