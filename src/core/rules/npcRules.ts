import type { NpcDisposition, NpcState } from '../schemas';

import { passRule, type RuleResult } from './ruleResult';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const appendBoundedMemory = (entries: string[], nextEntry?: string) => {
  if (!nextEntry) {
    return entries;
  }

  return [...entries, nextEntry].slice(-5);
};

export const deriveNpcDisposition = (
  relationship: number,
  trust: number,
  currentDisposition: NpcDisposition,
): NpcDisposition => {
  if (relationship <= -40) {
    return 'hostile';
  }

  if (trust <= 10) {
    return relationship < 0 ? 'hostile' : 'suspicious';
  }

  if (relationship >= 35 || trust >= 55) {
    return 'friendly';
  }

  if (currentDisposition === 'hostile' && relationship < 0) {
    return 'hostile';
  }

  if (trust >= 25) {
    return 'neutral';
  }

  return 'suspicious';
};

export interface NpcRelationUpdateResult extends RuleResult {
  state: NpcState;
  trustDelta: number;
  relationshipDelta: number;
}

export const applyNpcRelationChange = (
  npcState: NpcState,
  options: {
    trustDelta?: number;
    relationshipDelta?: number;
    memoryNote?: string;
    timestamp: string;
  },
): NpcRelationUpdateResult => {
  const trustDelta = options.trustDelta ?? 0;
  const relationshipDelta = options.relationshipDelta ?? 0;
  const trust = clamp(npcState.trust + trustDelta, 0, 100);
  const relationship = clamp(npcState.relationship + relationshipDelta, -100, 100);
  const currentDisposition = deriveNpcDisposition(
    relationship,
    trust,
    npcState.currentDisposition,
  );

  const state: NpcState = {
    ...npcState,
    trust,
    relationship,
    currentDisposition,
    memory: {
      ...npcState.memory,
      shortTerm: appendBoundedMemory(npcState.memory.shortTerm, options.memoryNote),
      lastInteractionAt: options.timestamp,
    },
  };

  return {
    ...passRule('npc relation updated'),
    state,
    trustDelta,
    relationshipDelta,
  };
};
