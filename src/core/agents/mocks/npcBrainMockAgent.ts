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
      /(help|aid|support|quest|ward|协作|支援|帮|任务|巡逻|情报|补给|相信|一起)/i.test(
        turn.text,
      ),
  );

const hasAggressiveTone = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue.some(
    (turn) =>
      turn.speaker === 'player' &&
      /(demand|threat|force|now|立刻|马上|现在|命令|威胁|逼|强行)/i.test(turn.text),
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
      ? `${input.npcDefinition.name}放缓语气，把下一步行动说得更清楚了。`
      : negativeTone
        ? `${input.npcDefinition.name}收紧姿态，带着明显戒备给出回应。`
        : `${input.npcDefinition.name}克制地更新了前路局势。`;

    return {
      npcReply,
      updatedDisposition,
      trustDelta,
      relationshipDelta,
      unlockedQuestIds,
      explanationHint: `${input.npcDefinition.name}根据玩家语气和当前信任阈值调整了回应。`,
    };
  }
}
