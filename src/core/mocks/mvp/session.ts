import type {
  AppSessionState,
  DebugToolsState,
  GameUiState,
  SessionSnapshot,
} from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockGameUiState: GameUiState = {
  activePanel: 'quest',
  selectedNpcId: mockIds.npcs.lyra,
  selectedQuestId: mockIds.quests.main,
  selectedAreaId: mockIds.areas.archive,
  selectedEventId: mockIds.events.archiveEchoes,
  isDebugOverlayOpen: false,
};

export const mockDebugToolsState: DebugToolsState = {
  debugModeEnabled: true,
  activeScenarioId: 'scenario:archive-briefing',
  forcedAreaId: null,
  forcedQuestId: null,
  forcedNpcId: null,
  forcedEncounterId: null,
  forcedEventId: null,
  forcedTactic: null,
  forcedPhaseId: null,
  simulatedPlayerPattern: 'analysis-first',
  combatSeed: 7,
  injectedPlayerTags: ['story', 'risky'],
  logsPanelOpen: true,
};

export const mockAppSessionState: AppSessionState = {
  lastVisitedRouteId: 'game',
  routeHistory: ['home', 'game', 'debug', 'game'],
  startedAt: mockTimeline.sessionStartedAt,
  lastActiveAt: mockTimeline.sessionLastActiveAt,
  hasHydratedSession: true,
};

export const mockSessionSnapshot: SessionSnapshot = {
  ui: mockGameUiState,
  debug: mockDebugToolsState,
  session: mockAppSessionState,
};
