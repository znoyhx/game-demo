import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import {
  mockNpcDefinitions,
  mockNpcStates,
  mockPlayerModelState,
  mockPlayerState,
  mockQuestDefinitions,
  mockQuestProgress,
} from '../../src/core/mocks/mvp';

describe('MockNpcBrainAgent', () => {
  it('recognizes supportive dialogue and rewards trust', async () => {
    const agent = createMockAgentSet().npcBrain;

    const result = await agent.run({
      npcDefinition: mockNpcDefinitions[0],
      npcState: mockNpcStates[0],
      questDefinitions: mockQuestDefinitions,
      questProgressEntries: mockQuestProgress,
      playerState: mockPlayerState,
      playerModel: mockPlayerModelState,
      recentDialogue: [
        {
          speaker: 'player',
          text: '我愿意帮你处理这条任务线，也可以一起想办法。',
        },
      ],
    });

    expect(result.trustDelta).toBeGreaterThan(0);
    expect(result.relationshipDelta).toBeGreaterThan(0);
    expect(result.npcReply).toContain(mockNpcDefinitions[0].name);
    expect(result.explanationHint).toContain('玩家');
  });

  it('recognizes aggressive dialogue and lowers trust', async () => {
    const agent = createMockAgentSet().npcBrain;

    const result = await agent.run({
      npcDefinition: mockNpcDefinitions[3],
      npcState: mockNpcStates[3],
      questDefinitions: mockQuestDefinitions,
      questProgressEntries: mockQuestProgress,
      playerState: mockPlayerState,
      playerModel: mockPlayerModelState,
      recentDialogue: [
        {
          speaker: 'player',
          text: '现在就把线索交出来，不要浪费我的时间。',
        },
      ],
    });

    expect(result.trustDelta).toBeLessThan(0);
    expect(result.relationshipDelta).toBeLessThan(0);
    expect(result.npcReply).toContain(mockNpcDefinitions[3].name);
  });

  it('varies dialogue with stored memory and player history', async () => {
    const agent = createMockAgentSet().npcBrain;
    const withHistory = await agent.run({
      npcDefinition: mockNpcDefinitions[0],
      npcState: mockNpcStates[0],
      questDefinitions: mockQuestDefinitions,
      questProgressEntries: mockQuestProgress,
      playerState: mockPlayerState,
      playerModel: {
        ...mockPlayerModelState,
        recentAreaVisits: [mockPlayerState.currentAreaId, 'area:sunken-archive'],
        recentQuestChoices: ['branch:main-trust-rowan'],
      },
      recentDialogue: [
        {
          speaker: 'player',
          text: '我想问问档案馆那边的情况。',
        },
      ],
    });
    const withoutHistory = await agent.run({
      npcDefinition: mockNpcDefinitions[0],
      npcState: {
        ...mockNpcStates[0],
        memory: {
          shortTerm: [],
          longTerm: [],
        },
      },
      questDefinitions: mockQuestDefinitions,
      questProgressEntries: mockQuestProgress,
      playerState: mockPlayerState,
      playerModel: {
        ...mockPlayerModelState,
        recentAreaVisits: ['area:cinder-crossroads'],
        recentQuestChoices: [],
      },
      recentDialogue: [
        {
          speaker: 'player',
          text: '我想问问档案馆那边的情况。',
        },
      ],
    });

    expect(withHistory.npcReply).toContain('档案馆');
    expect(withHistory.decisionBasis.join('')).toContain('Rowan');
    expect(withoutHistory.npcReply).not.toContain('Rowan');
  });
});
