import type { StoreApi } from 'zustand/vanilla';

import type {
  CombatEncounterDefinition,
  CombatState,
  ExplorationEncounterSignal,
  ExplorationState,
  PlayerState,
} from '../schemas';
import type { GameStoreState } from '../state';
import {
  buildDefaultExplorationState,
  resolveExplorationTrigger,
  resolveSearchInteraction,
} from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import type { CombatController } from './combatController';
import type { PlayerModelController } from './playerModelController';
import type { QuestProgressionController } from './questProgressionController';

interface ExplorationEncounterControllerOptions {
  store: StoreApi<GameStoreState>;
  saveController?: SaveWriter;
  combatController?: CombatController;
  questController?: QuestProgressionController;
  playerModelController?: PlayerModelController;
  now?: TimestampProvider;
}

export interface ExplorationTriggerControllerResult {
  areaId: string;
  trigger: 'on-enter' | 'on-search';
  signals: ExplorationEncounterSignal[];
  generatedEncounters: CombatEncounterDefinition[];
}

export interface ExplorationSearchControllerResult
  extends ExplorationTriggerControllerResult {
  interactionId: string;
  searchedAlready: boolean;
  resourceGain?: {
    resourceNodeId: string;
    itemId?: string;
    quantity: number;
    label: string;
  };
  playerState: PlayerState;
}

export interface ExplorationSignalActivationResult {
  signal: ExplorationEncounterSignal;
  combatState: CombatState | null;
}

export class ExplorationEncounterController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly saveController?: SaveWriter;

  private readonly combatController?: CombatController;

  private readonly questController?: QuestProgressionController;

  private readonly playerModelController?: PlayerModelController;

  private readonly now: TimestampProvider;

  constructor(options: ExplorationEncounterControllerOptions) {
    this.store = options.store;
    this.saveController = options.saveController;
    this.combatController = options.combatController;
    this.questController = options.questController;
    this.playerModelController = options.playerModelController;
    this.now = options.now ?? defaultTimestampProvider;
  }

  private mergeGeneratedEncounters(encounters: CombatEncounterDefinition[]) {
    if (encounters.length === 0) {
      return;
    }

    const state = this.store.getState();
    const merged = [
      ...state.combatEncounterOrder.map(
        (encounterId) => state.combatEncountersById[encounterId],
      ),
    ];

    encounters.forEach((encounter) => {
      if (!merged.some((existingEncounter) => existingEncounter.id === encounter.id)) {
        merged.push(encounter);
      }
    });

    state.setCombatEncounters(merged);
  }

  private buildNextExplorationState(
    currentState: ExplorationState,
    patch: Partial<ExplorationState>,
  ): ExplorationState {
    return {
      signals: patch.signals ?? currentState.signals,
      ruleStates: patch.ruleStates ?? currentState.ruleStates,
      searchedInteractionIds:
        patch.searchedInteractionIds ?? currentState.searchedInteractionIds,
      collectedResourceNodeIds:
        patch.collectedResourceNodeIds ?? currentState.collectedResourceNodeIds,
    };
  }

  async handleAreaEnter(
    areaId: string,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<ExplorationTriggerControllerResult | null> {
    const state = this.store.getState();
    const area = state.areasById[areaId];

    if (!area) {
      return null;
    }

    const resolution = resolveExplorationTrigger({
      area,
      trigger: 'on-enter',
      worldFlags: state.worldRuntime.flags,
      explorationState: state.explorationState,
      createdAt: this.now(),
    });

    if (resolution.signals.length > 0) {
      state.setExplorationState(
        this.buildNextExplorationState(state.explorationState, {
          signals: [...state.explorationState.signals, ...resolution.signals],
          ruleStates: resolution.ruleStates,
        }),
      );
      this.mergeGeneratedEncounters(resolution.generatedEncounters);
    }

    if ((options?.autoSave ?? true) && resolution.signals.length > 0) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        'auto',
        'exploration',
      );
    }

    return {
      areaId,
      trigger: 'on-enter',
      signals: resolution.signals,
      generatedEncounters: resolution.generatedEncounters,
    };
  }

  async searchInteraction(
    interactionId: string,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<ExplorationSearchControllerResult | null> {
    const state = this.store.getState();
    const area =
      state.areasById[state.mapState.currentAreaId] ??
      Object.values(state.areasById).find((entry) =>
        entry.interactionPoints.some((point) => point.id === interactionId),
      ) ??
      null;

    if (!area) {
      return null;
    }

    const searchResolution = resolveSearchInteraction({
      area,
      interactionId,
      explorationState: state.explorationState,
      playerState: state.player,
    });

    if (!searchResolution.ok) {
      return null;
    }

    let nextExplorationState = this.buildNextExplorationState(
      state.explorationState,
      {
        searchedInteractionIds: searchResolution.searchedInteractionIds,
        collectedResourceNodeIds: searchResolution.collectedResourceNodeIds,
      },
    );
    let generatedEncounters: CombatEncounterDefinition[] = [];
    let signals: ExplorationEncounterSignal[] = [];

    if (!searchResolution.searchedAlready) {
      const spawnResolution = resolveExplorationTrigger({
        area,
        trigger: 'on-search',
        worldFlags: state.worldRuntime.flags,
        explorationState: nextExplorationState,
        createdAt: this.now(),
        sourceInteractionId: interactionId,
      });

      generatedEncounters = spawnResolution.generatedEncounters;
      signals = spawnResolution.signals;
      nextExplorationState = this.buildNextExplorationState(nextExplorationState, {
        signals: [...nextExplorationState.signals, ...signals],
        ruleStates: spawnResolution.ruleStates,
      });
    }

    state.setExplorationState(nextExplorationState);

    if (
      searchResolution.playerState !== state.player ||
      Boolean(searchResolution.resourceGain)
    ) {
      state.setPlayerState(searchResolution.playerState);
      await this.questController?.refreshQuestStatuses({
        autoSave: false,
      });
    }

    this.mergeGeneratedEncounters(generatedEncounters);

    if (!searchResolution.searchedAlready) {
      await this.playerModelController?.recordExplorationSearch(
        {
          resourceFound: Boolean(searchResolution.resourceGain),
          triggeredAmbush: signals.length > 0,
        },
        {
          autoSave: false,
        },
      );
    }

    if (
      (options?.autoSave ?? true) &&
      (!searchResolution.searchedAlready || Boolean(searchResolution.resourceGain))
    ) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        'auto',
        'exploration',
      );
    }

    return {
      areaId: area.id,
      trigger: 'on-search',
      interactionId,
      searchedAlready: searchResolution.searchedAlready,
      resourceGain: searchResolution.resourceGain,
      playerState: searchResolution.playerState,
      signals,
      generatedEncounters,
    };
  }

  async activateSignal(
    signalId: string,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<ExplorationSignalActivationResult | null> {
    const state = this.store.getState();
    const signal = state.explorationState.signals.find((entry) => entry.id === signalId);

    if (!signal) {
      return null;
    }

    const combatState = await this.combatController?.startEncounter(signal.encounterId);

    if (!combatState) {
      return null;
    }

    state.removeExplorationSignal(signal.id);

    if (options?.autoSave ?? true) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        'auto',
        'exploration',
      );
    }

    return {
      signal,
      combatState,
    };
  }

  getSignal(signalId: string) {
    return (
      this.store
        .getState()
        .explorationState.signals.find((signal) => signal.id === signalId) ?? null
    );
  }

  resetExplorationState() {
    this.store.getState().setExplorationState(buildDefaultExplorationState());
  }
}
