import {
  npcBrainInputSchema,
  npcBrainOutputSchema,
  type NpcBrainInput,
  type NpcBrainOutput,
} from '../../schemas';

import type { NpcBrainAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const hasSupportiveTone = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue.some(
    (turn) =>
      turn.speaker === 'player' &&
      /(help|aid|support|quest|ward)/i.test(turn.text),
  );

const hasAggressiveTone = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue.some(
    (turn) =>
      turn.speaker === 'player' &&
      /(demand|threat|force|now)/i.test(turn.text),
  );

export class MockNpcBrainAgent
  extends ValidatedMockAgent<NpcBrainInput, NpcBrainOutput>
  implements NpcBrainAgent
{
  constructor() {
    super('npc-brain', npcBrainInputSchema, npcBrainOutputSchema);
  }

  protected execute(input: NpcBrainInput): NpcBrainOutput {
    const positiveTone = hasSupportiveTone(input.recentDialogue);
    const negativeTone = hasAggressiveTone(input.recentDialogue);
    const trustDelta = positiveTone ? 4 : negativeTone ? -4 : 1;
    const relationshipDelta = positiveTone ? 3 : negativeTone ? -5 : 1;
    const nextTrust = Math.max(0, Math.min(100, input.npcState.trust + trustDelta));

    let updatedDisposition = input.npcState.currentDisposition;

    if (nextTrust >= 45 || input.npcState.relationship + relationshipDelta >= 30) {
      updatedDisposition = 'friendly';
    } else if (negativeTone && input.npcState.relationship + relationshipDelta < 0) {
      updatedDisposition = 'suspicious';
    }

    const unlockedQuestIds = input.activeQuests
      .filter(
        (quest) =>
          quest.status === 'available' &&
          input.npcState.hasGivenQuestIds.includes(quest.questId),
      )
      .map((quest) => quest.questId);

    const npcReply = positiveTone
      ? `${input.npcDefinition.name} steadies their voice and shares a clearer next step.`
      : negativeTone
        ? `${input.npcDefinition.name} tightens their stance and answers cautiously.`
        : `${input.npcDefinition.name} offers a measured update about the road ahead.`;

    return {
      npcReply,
      updatedDisposition,
      trustDelta,
      relationshipDelta,
      unlockedQuestIds,
      explanationHint: `${input.npcDefinition.name} reacted to the player's tone and the current trust threshold.`,
    };
  }
}
