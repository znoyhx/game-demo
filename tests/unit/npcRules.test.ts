import { describe, expect, it } from 'vitest';

import { mockIds, mockNpcStates, mockTimeline } from '../../src/core/mocks';
import { applyNpcRelationChange, deriveNpcDisposition } from '../../src/core/rules';

describe('npc rules', () => {
  it('derives friendly disposition for strong trust and relationship', () => {
    expect(deriveNpcDisposition(40, 60, 'neutral')).toBe('friendly');
  });

  it('applies trust, relationship, and memory updates with bounds', () => {
    const rowan = mockNpcStates.find((npcState) => npcState.npcId === mockIds.npcs.rowan)!;

    const result = applyNpcRelationChange(rowan, {
      trustDelta: 20,
      relationshipDelta: 30,
      memoryNote: 'The player reinforced the archive approach with Rowan.',
      timestamp: mockTimeline.saveUpdatedAt,
    });

    expect(result.state.trust).toBe(36);
    expect(result.state.relationship).toBe(38);
    expect(result.state.currentDisposition).toBe('friendly');
    expect(result.state.memory.shortTerm[result.state.memory.shortTerm.length - 1]).toContain(
      'Rowan',
    );
  });
});
