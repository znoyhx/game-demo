import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { CombatController } from '../../src/core/controllers/combatController';
import { DebugScenarioController } from '../../src/core/controllers/debugScenarioController';
import { NpcInteractionController } from '../../src/core/controllers/npcInteractionController';
import { QuestProgressionController } from '../../src/core/controllers/questProgressionController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

const fixedNow = () => '2026-03-24T16:00:00.000Z';

describe('debug scenario controller', () => {
  it('injects NPC relationship, trust, and memory state directly for debug use', async () => {
    const store = createGameStore(structuredClone(mockSaveSnapshot));
    const saveWriter = new SaveWriterSpy();
    const controller = new DebugScenarioController({
      store,
      saveController: saveWriter,
      now: fixedNow,
    });

    const result = await controller.injectNpcState({
      npcId: mockIds.npcs.lyra,
      trust: 72,
      relationship: 34,
      currentDisposition: 'friendly',
      emotionalState: 'grateful',
      shortTermMemory: ['玩家刚稳定了前线补给线。'],
      longTermMemory: ['莱拉开始把玩家视作关键协作者。'],
      currentGoal: '守住补给线',
    });

    expect(result?.trust).toBe(72);
    expect(result?.relationship).toBe(34);
    expect(result?.currentDisposition).toBe('friendly');
    expect(result?.emotionalState).toBe('grateful');
    expect(result?.memory.shortTerm).toEqual(['玩家刚稳定了前线补给线。']);
    expect(result?.memory.longTerm).toEqual(['莱拉开始把玩家视作关键协作者。']);
    expect(result?.currentGoal).toBe('守住补给线');
    expect(store.getState().debugTools.forcedNpcId).toBe(mockIds.npcs.lyra);
    expect(saveWriter.calls).toEqual(['debug']);
  });

  it('tests a dialogue branch and can roll the NPC state back without full progression', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    snapshot.quests.progress = snapshot.quests.progress.map((progress) =>
      progress.questId === mockIds.quests.main
        ? {
            ...progress,
            status: 'available',
            currentObjectiveIndex: 0,
            completedObjectiveIds: [],
            updatedAt: fixedNow(),
          }
        : progress,
    );
    snapshot.npcs.runtime = snapshot.npcs.runtime.map((npcState) =>
      npcState.npcId === mockIds.npcs.lyra
        ? {
            ...npcState,
            hasGivenQuestIds: [],
            relationshipNetwork: [],
          }
        : npcState,
    );

    const store = createGameStore(snapshot);
    const saveWriter = new SaveWriterSpy();
    const questController = new QuestProgressionController({
      store,
      saveController: saveWriter,
      now: fixedNow,
    });
    const npcController = new NpcInteractionController({
      store,
      agents: createMockAgentSet(),
      saveController: saveWriter,
      questController,
      now: fixedNow,
    });
    const controller = new DebugScenarioController({
      store,
      saveController: saveWriter,
      questController,
      npcController,
      now: fixedNow,
    });

    const baselineTrust = store.getState().npcStatesById[mockIds.npcs.lyra].trust;

    const result = await controller.testNpcDialogueBranch(mockIds.npcs.lyra, 'quest');

    expect(result?.explanation?.trust.delta).toBeGreaterThan(0);
    expect(result?.explanation?.decisionBasis.length).toBeGreaterThan(0);
    expect(store.getState().npcStatesById[mockIds.npcs.lyra].trust).toBeGreaterThan(
      baselineTrust,
    );
    expect(store.getState().questProgressById[mockIds.quests.main]?.status).toBe(
      'active',
    );

    const reset = await controller.resetNpcDebugState(mockIds.npcs.lyra);

    expect(reset?.trust).toBe(baselineTrust);
    expect(store.getState().questProgressById[mockIds.quests.main]?.status).toBe(
      'available',
    );
  });

  it('locks a forced boss phase for the active encounter and updates combat state immediately', async () => {
    const agents = createMockAgentSet();
    const store = createGameStore(structuredClone(mockSaveSnapshot));
    const saveWriter = new SaveWriterSpy();
    const combatController = new CombatController({
      store,
      agents,
      now: fixedNow,
    });
    const controller = new DebugScenarioController({
      store,
      saveController: saveWriter,
      combatController,
      now: fixedNow,
    });

    await controller.forceEncounter(mockIds.encounter);
    const result = await controller.setForcedBossPhase('phase:embers-unbound');

    expect(store.getState().debugTools.forcedPhaseId).toBe('phase:embers-unbound');
    expect(store.getState().combatState?.currentPhaseId).toBe(
      'phase:embers-unbound',
    );
    expect(
      store.getState().combatState?.logs[
        (store.getState().combatState?.logs.length ?? 1) - 1
      ]?.actions[0]?.description,
    ).toContain('强制切换');
    expect(result && 'currentPhaseId' in result ? result.currentPhaseId : null).toBe(
      'phase:embers-unbound',
    );
  });

  it('simulates combat rounds deterministically when the same seed and pattern are reused', async () => {
    const runSimulation = async () => {
      const agents = createMockAgentSet();
      const store = createGameStore(structuredClone(mockSaveSnapshot));
      const combatController = new CombatController({
        store,
        agents,
        now: fixedNow,
      });
      const controller = new DebugScenarioController({
        store,
        combatController,
        now: fixedNow,
      });

      await controller.forceEncounter(mockIds.encounter);
      await controller.setForcedCombatTactic('counter');
      await controller.setSimulatedPlayerPattern('analysis-first');
      await controller.setCombatSeed(11);

      const steps = await controller.simulateCombatRounds(3);

      return {
        steps,
        combatState: store.getState().combatState,
      };
    };

    const firstRun = await runSimulation();
    const secondRun = await runSimulation();

    expect(firstRun.steps).toEqual(secondRun.steps);
    expect(
      firstRun.combatState?.logs.map((log) => log.actions[0]?.actionType),
    ).toEqual(secondRun.combatState?.logs.map((log) => log.actions[0]?.actionType));
    expect(firstRun.combatState?.activeTactic).toBe('counter');
  });
});
