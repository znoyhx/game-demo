import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import {
  mockNpcDefinitions,
  mockNpcStates,
  mockPlayerState,
  mockQuestProgress,
} from '../../src/core/mocks/mvp';

describe('MockNpcBrainAgent', () => {
  it('recognizes supportive Chinese dialogue and rewards trust', async () => {
    const agent = createMockAgentSet().npcBrain;

    const result = await agent.run({
      npcDefinition: mockNpcDefinitions[0],
      npcState: mockNpcStates[0],
      activeQuests: mockQuestProgress,
      playerState: mockPlayerState,
      recentDialogue: [
        {
          speaker: 'player',
          text: '请帮我把巡逻情报和下一个任务说明白，我们一起把这条路稳住。',
        },
      ],
    });

    expect(result.trustDelta).toBe(4);
    expect(result.relationshipDelta).toBe(3);
    expect(result.npcReply).toContain(mockNpcDefinitions[0].name);
    expect(result.explanationHint).toContain('玩家语气');
  });

  it('recognizes aggressive Chinese dialogue and lowers trust', async () => {
    const agent = createMockAgentSet().npcBrain;

    const result = await agent.run({
      npcDefinition: mockNpcDefinitions[3],
      npcState: mockNpcStates[3],
      activeQuests: mockQuestProgress,
      playerState: mockPlayerState,
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
});
