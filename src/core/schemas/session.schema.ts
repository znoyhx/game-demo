import { z } from 'zod';

import {
  combatDebugPlayerPatternSchema,
  enemyTacticTypeSchema,
} from './combat.schema';
import {
  areaIdSchema,
  encounterIdSchema,
  eventIdSchema,
  genericIdSchema,
  isoTimestampSchema,
  npcIdSchema,
  questIdSchema,
} from './shared';
import { playerProfileTagSchema } from './player.schema';

export const routeIdSchema = z.enum(['home', 'game', 'debug', 'review']);
export const gameUiPanelSchema = z.enum([
  'map',
  'npc',
  'quest',
  'combat',
  'review',
  'debug',
]);

export const gameUiStateSchema = z
  .object({
    activePanel: gameUiPanelSchema,
    selectedNpcId: npcIdSchema.nullable(),
    selectedQuestId: questIdSchema.nullable(),
    selectedAreaId: areaIdSchema.nullable(),
    selectedEventId: eventIdSchema.nullable(),
    isDebugOverlayOpen: z.boolean(),
  })
  .strict();

export const debugToolsStateSchema = z
  .object({
    debugModeEnabled: z.boolean(),
    activeScenarioId: z.string().trim().min(1).optional(),
    forcedAreaId: areaIdSchema.nullable(),
    forcedQuestId: questIdSchema.nullable(),
    forcedNpcId: npcIdSchema.nullable(),
    forcedEncounterId: encounterIdSchema.nullable(),
    forcedEventId: eventIdSchema.nullable(),
    forcedTactic: enemyTacticTypeSchema.nullable(),
    forcedPhaseId: genericIdSchema.nullable(),
    simulatedPlayerPattern: combatDebugPlayerPatternSchema.nullable(),
    combatSeed: z.number().int().nonnegative().nullable(),
    injectedPlayerTags: z.array(playerProfileTagSchema),
    logsPanelOpen: z.boolean(),
  })
  .strict();

export const appSessionStateSchema = z
  .object({
    lastVisitedRouteId: routeIdSchema,
    routeHistory: z.array(routeIdSchema),
    startedAt: isoTimestampSchema.optional(),
    lastActiveAt: isoTimestampSchema.optional(),
    hasHydratedSession: z.boolean(),
  })
  .strict();

export const sessionSnapshotSchema = z
  .object({
    ui: gameUiStateSchema,
    debug: debugToolsStateSchema,
    session: appSessionStateSchema,
  })
  .strict();

export type RouteId = z.infer<typeof routeIdSchema>;
export type GameUiPanel = z.infer<typeof gameUiPanelSchema>;
export type GameUiState = z.infer<typeof gameUiStateSchema>;
export type DebugToolsState = z.infer<typeof debugToolsStateSchema>;
export type AppSessionState = z.infer<typeof appSessionStateSchema>;
export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
