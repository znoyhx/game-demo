import type { StoreApi } from 'zustand/vanilla';

import { mockSaveSnapshot } from '../mocks';
import type {
  CombatDebugPlayerPattern,
  EnemyTacticType,
  DebugToolsState,
  NpcDebugStateInjection,
  NpcDialogueIntent,
  NpcState,
  PlayerProfileTag,
  QuestProgress,
  QuestStatus,
  SaveSnapshot,
  SessionSnapshot,
} from '../schemas';
import { npcDebugStateInjectionSchema } from '../schemas';
import type { GameStoreState } from '../state';
import { resolveSimulatedCombatAction } from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { AreaDebugController } from './areaDebugController';
import { AreaNavigationController } from './areaNavigationController';
import { CombatController } from './combatController';
import { EventTriggerController } from './eventTriggerController';
import { NpcInteractionController } from './npcInteractionController';
import { PlayerModelController } from './playerModelController';
import { QuestProgressionController } from './questProgressionController';

interface DebugScenarioControllerOptions {
  store: StoreApi<GameStoreState>;
  saveController?: SaveWriter;
  areaDebugController?: AreaDebugController;
  areaController?: AreaNavigationController;
  questController?: QuestProgressionController;
  npcController?: NpcInteractionController;
  combatController?: CombatController;
  eventController?: EventTriggerController;
  playerModelController?: PlayerModelController;
  now?: TimestampProvider;
}

export class DebugScenarioController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly saveController?: SaveWriter;

  private readonly areaDebugController?: AreaDebugController;

  private readonly areaController?: AreaNavigationController;

  private readonly questController?: QuestProgressionController;

  private readonly npcController?: NpcInteractionController;

  private readonly combatController?: CombatController;

  private readonly eventController?: EventTriggerController;

  private readonly playerModelController?: PlayerModelController;

  private readonly now: TimestampProvider;

  private readonly npcBaselines = new Map<
    string,
    {
      saveSnapshot: SaveSnapshot;
      sessionSnapshot: SessionSnapshot;
    }
  >();

  constructor(options: DebugScenarioControllerOptions) {
    this.store = options.store;
    this.saveController = options.saveController;
    this.areaDebugController = options.areaDebugController;
    this.areaController = options.areaController;
    this.questController = options.questController;
    this.npcController = options.npcController;
    this.combatController = options.combatController;
    this.eventController = options.eventController;
    this.playerModelController = options.playerModelController;
    this.now = options.now ?? defaultTimestampProvider;
  }

  private enableDebugState(patch: Partial<DebugToolsState>) {
    this.store.getState().patchDebugToolsState({
      debugModeEnabled: true,
      ...patch,
    });
  }

  async loadScenario(snapshot: SaveSnapshot = mockSaveSnapshot) {
    this.store.getState().hydrateFromSnapshot(snapshot);
    this.enableDebugState({
      activeScenarioId: snapshot.metadata.id,
      logsPanelOpen: true,
    });
    await maybeAutoSave(this.store, this.saveController, 'debug');
  }

  async forceArea(areaId: string) {
    if (this.areaDebugController) {
      return this.areaDebugController.jumpToArea(areaId, {
        autoSave: true,
      });
    }

    this.enableDebugState({
      forcedAreaId: areaId,
    });

    return this.areaController?.enterArea(areaId, {
      ignoreConnectivity: true,
      autoSave: false,
    });
  }

  async forceQuestStatus(questId: string, status: QuestStatus) {
    this.enableDebugState({
      forcedQuestId: questId,
    });
    return this.questController?.forceQuestStatus(questId, status);
  }

  async forceNpcState(npcId: string, patch: Partial<NpcState>) {
    const state = this.store.getState();
    const currentState = state.npcStatesById[npcId];
    if (!currentState) {
      return null;
    }

    const nextState: NpcState = {
      ...currentState,
      ...patch,
    };

    state.upsertNpcState(nextState);
    this.enableDebugState({
      forcedNpcId: npcId,
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');
    return nextState;
  }

  async injectNpcState(request: NpcDebugStateInjection) {
    const normalized = npcDebugStateInjectionSchema.parse(request);
    const currentState = this.store.getState().npcStatesById[normalized.npcId];

    if (!currentState) {
      return null;
    }

    return this.forceNpcState(normalized.npcId, {
      trust: normalized.trust ?? currentState.trust,
      relationship: normalized.relationship ?? currentState.relationship,
      currentDisposition:
        normalized.currentDisposition ?? currentState.currentDisposition,
      emotionalState: normalized.emotionalState ?? currentState.emotionalState,
      currentGoal: normalized.currentGoal ?? currentState.currentGoal,
      memory: {
        ...currentState.memory,
        shortTerm: normalized.shortTermMemory ?? currentState.memory.shortTerm,
        longTerm: normalized.longTermMemory ?? currentState.memory.longTerm,
        lastInteractionAt:
          normalized.lastInteractionAt === null
            ? undefined
            : normalized.lastInteractionAt ?? currentState.memory.lastInteractionAt,
      },
    });
  }

  private captureNpcBaseline(npcId: string) {
    if (this.npcBaselines.has(npcId)) {
      return;
    }

    const state = this.store.getState();
    this.npcBaselines.set(npcId, {
      saveSnapshot: state.exportSaveSnapshot(),
      sessionSnapshot: state.exportSessionSnapshot(),
    });
  }

  async openNpcDialogue(npcId: string) {
    this.enableDebugState({
      forcedNpcId: npcId,
      logsPanelOpen: true,
    });

    return this.npcController?.startDialogue(npcId) ?? null;
  }

  async testNpcDialogueBranch(npcId: string, optionId: NpcDialogueIntent) {
    if (!this.npcController) {
      return null;
    }

    this.captureNpcBaseline(npcId);
    this.enableDebugState({
      forcedNpcId: npcId,
      logsPanelOpen: true,
    });

    if (!this.npcController.getDialogueState(npcId)) {
      await this.npcController.startDialogue(npcId);
    }

    return this.npcController.chooseDialogueOption(npcId, optionId);
  }

  async resetNpcDebugState(npcId: string) {
    const baseline = this.npcBaselines.get(npcId);

    if (!baseline) {
      return null;
    }

    this.store.getState().hydrateFromSnapshot(baseline.saveSnapshot);
    this.store.getState().hydrateFromSessionSnapshot(baseline.sessionSnapshot);
    this.enableDebugState({
      forcedNpcId: npcId,
      logsPanelOpen: true,
    });
    this.npcBaselines.delete(npcId);
    await maybeAutoSave(this.store, this.saveController, 'debug');
    return this.store.getState().npcStatesById[npcId] ?? null;
  }

  async forceEncounter(encounterId: string) {
    this.enableDebugState({
      forcedEncounterId: encounterId,
      logsPanelOpen: true,
    });
    return this.combatController?.startEncounter(encounterId);
  }

  async setForcedCombatTactic(tactic: EnemyTacticType | null) {
    this.enableDebugState({
      forcedTactic: tactic,
      logsPanelOpen: true,
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');
    return this.store.getState().debugTools.forcedTactic;
  }

  async setForcedBossPhase(phaseId: string | null) {
    this.enableDebugState({
      forcedPhaseId: phaseId,
      logsPanelOpen: true,
    });

    if (!phaseId) {
      await maybeAutoSave(this.store, this.saveController, 'debug');
      return this.store.getState().combatState;
    }

    const result = await this.combatController?.forceBossPhase(phaseId);
    await maybeAutoSave(this.store, this.saveController, 'debug');
    return result ?? null;
  }

  async setCombatSeed(seed: number | null) {
    this.enableDebugState({
      combatSeed:
        seed === null || !Number.isFinite(seed)
          ? null
          : Math.max(0, Math.floor(seed)),
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');
    return this.store.getState().debugTools.combatSeed;
  }

  async setSimulatedPlayerPattern(pattern: CombatDebugPlayerPattern | null) {
    this.enableDebugState({
      simulatedPlayerPattern: pattern,
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');
    return this.store.getState().debugTools.simulatedPlayerPattern;
  }

  async simulateCombatRounds(roundCount: number) {
    const normalizedRoundCount = Math.min(Math.max(Math.round(roundCount), 1), 12);
    const initialState = this.store.getState();
    const initialCombatState = initialState.combatState;

    if (!initialCombatState || !this.combatController) {
      return [];
    }

    const pattern =
      initialState.debugTools.simulatedPlayerPattern ?? 'direct-pressure';
    const seed = initialState.debugTools.combatSeed ?? 0;
    const steps: Array<{
      turn: number;
      actionType: string;
      tactic: EnemyTacticType;
      phaseId?: string;
      result?: string;
    }> = [];

    for (let index = 0; index < normalizedRoundCount; index += 1) {
      const state = this.store.getState();
      const combatState = state.combatState;

      if (!combatState || combatState.result) {
        break;
      }

      const actionDecision = resolveSimulatedCombatAction({
        combatState,
        playerState: state.player,
        pattern,
        seed: seed + index,
      });
      const result = await this.combatController.submitPlayerAction(
        actionDecision.selectedAction,
      );

      if (!result) {
        break;
      }

      steps.push({
        turn: combatState.turn,
        actionType: actionDecision.selectedAction,
        tactic:
          result.combatState.activeTactic ?? this.store.getState().combatState?.activeTactic ?? combatState.activeTactic,
        phaseId: result.combatState.currentPhaseId,
        result: result.result,
      });

      if (!result.ok || result.result) {
        break;
      }
    }

    if (steps.length > 0) {
      await maybeAutoSave(this.store, this.saveController, 'debug');
    }

    return steps;
  }

  async forceEvent(eventId: string) {
    this.enableDebugState({
      forcedEventId: eventId,
    });
    return this.eventController?.triggerEvent(eventId, 'debug');
  }

  async injectPlayerTags(tags: PlayerProfileTag[]) {
    this.enableDebugState({
      injectedPlayerTags: tags,
    });
    await this.playerModelController?.injectPlayerTags(tags);
  }

  async upsertQuestProgress(progress: QuestProgress) {
    this.store.getState().upsertQuestProgress({
      ...progress,
      updatedAt: this.now(),
    });
    await maybeAutoSave(this.store, this.saveController, 'debug');
  }

  async resetToMockWorld() {
    this.store.getState().resetToMockSnapshot();
    this.enableDebugState({
      activeScenarioId: mockSaveSnapshot.metadata.id,
      forcedAreaId: null,
      forcedQuestId: null,
      forcedNpcId: null,
      forcedEncounterId: null,
      forcedEventId: null,
      forcedTactic: null,
      forcedPhaseId: null,
      simulatedPlayerPattern: null,
      combatSeed: null,
      injectedPlayerTags: [],
    });
    await maybeAutoSave(this.store, this.saveController, 'debug');
  }
}
