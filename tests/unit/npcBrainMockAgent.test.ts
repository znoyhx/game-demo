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
  it('recognizes supportive Chinese dialogue and rewards trust', async () => {
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
          text: '请帮我把巡逻情报和下一步任务说明白，我们一起把这条路线稳住。',
        },
      ],
    });

    expect(result.trustDelta).toBe(5);
    expect(result.relationshipDelta).toBe(3);
    expect(result.npcReply).toContain(mockNpcDefinitions[0].name);
    expect(result.explanationHint).toContain('玩家最近的区域行动');
  });

  it('recognizes aggressive Chinese dialogue and lowers trust', async () => {
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
          text: '立刻回答我，现在就照做，不要再拖延。',
        },
      ],
    });

    expect(result.trustDelta).toBe(-4);
    expect(result.relationshipDelta).toBe(-5);
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
          text: '把你记住的线索告诉我。',
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
          text: '把你记住的线索告诉我。',
        },
      ],
    });

    expect(withHistory.npcReply).toContain('罗文');
    expect(withHistory.npcReply).toContain('沉没秘库');
    expect(withoutHistory.npcReply).not.toContain('沉没秘库');
  });
});
