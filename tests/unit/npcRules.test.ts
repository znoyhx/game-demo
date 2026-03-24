import { describe, expect, it } from 'vitest';

import { mockIds, mockNpcStates, mockTimeline } from '../../src/core/mocks';
import {
  applyNpcInteractionStateChange,
  applyNpcRelationChange,
  buildNpcInteractionExplanation,
  deriveNpcDisposition,
  resolveNpcKnowledgeDisclosure,
} from '../../src/core/rules';

describe('npc rules', () => {
  it('derives friendly disposition for strong trust and relationship', () => {
    expect(deriveNpcDisposition(40, 60, 'neutral')).toBe('friendly');
  });

  it('applies trust, relationship, and memory updates with bounds', () => {
    const rowan = mockNpcStates.find((npcState) => npcState.npcId === mockIds.npcs.rowan)!;

    const result = applyNpcRelationChange(rowan, {
      trustDelta: 20,
      relationshipDelta: 30,
      memoryNote: '玩家进一步稳住了罗文负责的巡防路线。',
      timestamp: mockTimeline.saveUpdatedAt,
    });

    expect(result.state.trust).toBe(36);
    expect(result.state.relationship).toBe(38);
    expect(result.state.currentDisposition).toBe('friendly');
    expect(
      result.state.memory.shortTerm[result.state.memory.shortTerm.length - 1],
    ).toContain('罗文');
  });

  it('applies stance, emotion, and relationship-network updates through the interaction rule', () => {
    const lyra = mockNpcStates.find((npcState) => npcState.npcId === mockIds.npcs.lyra)!;

    const result = applyNpcInteractionStateChange(lyra, {
      trustDelta: 5,
      relationshipDelta: 4,
      intent: 'quest',
      memoryNote: '玩家确认会沿着前线协防路线推进。',
      longTermMemoryNote: '莱拉认为玩家已经能承担更关键的线路任务。',
      relationshipNetworkChanges: [
        {
          targetNpcId: mockIds.npcs.rowan,
          delta: 6,
          bond: '协防链路',
        },
      ],
      issuedQuestIds: ['quest:test'],
      timestamp: mockTimeline.saveUpdatedAt,
    });

    expect(result.state.currentDisposition).toBe('friendly');
    expect(result.state.emotionalState).toBe('grateful');
    expect(result.state.hasGivenQuestIds).toContain('quest:test');
    expect(
      result.state.relationshipNetwork.find(
        (edge) => edge.targetNpcId === mockIds.npcs.rowan,
      )?.strength,
    ).toBe(48);
    expect(result.state.memory.longTerm).toContain(
      '莱拉认为玩家已经能承担更关键的线路任务。',
    );
  });

  it('reveals trust-gated facts only after trust rises and reserves secrets for higher trust', () => {
    const mirel = mockNpcStates.find((npcState) => npcState.npcId === mockIds.npcs.mirel)!;

    const lowTrustMirel = {
      ...mirel,
      trust: 8,
    };
    const beforeTrust = resolveNpcKnowledgeDisclosure(lowTrustMirel, 'ask');
    const afterTrustState = applyNpcInteractionStateChange(lowTrustMirel, {
      trustDelta: 16,
      relationshipDelta: 16,
      intent: 'ask',
      timestamp: mockTimeline.saveUpdatedAt,
    }).state;
    const afterTrust = resolveNpcKnowledgeDisclosure(afterTrustState, 'ask');
    const afterSecretState = applyNpcInteractionStateChange(afterTrustState, {
      trustDelta: 36,
      relationshipDelta: 20,
      intent: 'persuade',
      timestamp: mockTimeline.saveUpdatedAt,
    }).state;
    const afterSecret = resolveNpcKnowledgeDisclosure(afterSecretState, 'persuade');

    expect(beforeTrust.facts).not.toContain(
      '米蕾尔发现圣所门口附近藏有一段反制仪式的记载。',
    );
    expect(afterTrust.facts).toContain(
      '米蕾尔发现圣所门口附近藏有一段反制仪式的记载。',
    );
    expect(afterTrust.secrets).toEqual([]);
    expect(afterSecret.secrets).toContain(
      '米蕾尔曾为了研究抄录过一段被禁的灰缚咏唱。',
    );
  });

  it('builds concise explanation payloads for trust and relationship changes', () => {
    const lyra = mockNpcStates.find((npcState) => npcState.npcId === mockIds.npcs.lyra)!;
    const updated = applyNpcInteractionStateChange(lyra, {
      trustDelta: 6,
      relationshipDelta: 4,
      intent: 'quest',
      disclosedFacts: ['前线补给线已经重新点亮。'],
      relationshipNetworkChanges: [
        {
          targetNpcId: mockIds.npcs.rowan,
          delta: 6,
          bond: '协防链路',
        },
      ],
      issuedQuestIds: ['quest:test'],
      timestamp: mockTimeline.saveUpdatedAt,
    }).state;

    const explanation = buildNpcInteractionExplanation({
      npcId: mockIds.npcs.lyra,
      npcName: '莱拉',
      beforeState: lyra,
      afterState: updated,
      intent: 'quest',
      questOfferIds: ['quest:test'],
      disclosedFacts: ['前线补给线已经重新点亮。'],
      disclosedSecrets: [],
      relationshipNetworkChanges: [
        {
          targetNpcId: mockIds.npcs.rowan,
          delta: 6,
          bond: '协防链路',
        },
      ],
      itemTransfers: [],
      playerGoldDelta: 0,
      decisionBasis: ['玩家语气更偏合作，NPC 会下调戒备'],
      explanationHint: '莱拉会参考玩家的近期行动和对话语气。',
    });

    expect(explanation.npcId).toBe(mockIds.npcs.lyra);
    expect(explanation.trust.delta).toBe(6);
    expect(explanation.relationship.delta).toBe(4);
    expect(explanation.trust.reasons.length).toBeGreaterThan(0);
    expect(explanation.relationship.reasons.length).toBeGreaterThan(0);
    expect(explanation.decisionBasis).toContain('玩家语气更偏合作，NPC 会下调戒备');
    expect(explanation.debugSummary).toContain('态度');
  });
});
