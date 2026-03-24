import {
  npcBrainInputSchema,
  npcBrainOutputSchema,
  type NpcBrainInput,
  type NpcBrainOutput,
} from '../../schemas';
import { mockIds } from '../../mocks/mvp';

import type { NpcBrainAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const hasSupportiveTone = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue.some(
    (turn) =>
      turn.speaker === 'player' &&
      /(help|aid|support|quest|team|协助|帮忙|一起|支援|补给|相信)/i.test(turn.text),
  );

const hasAggressiveTone = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue.some(
    (turn) =>
      turn.speaker === 'player' &&
      /(demand|threat|force|now|立刻|马上|命令|威胁|逼迫|不准拖延)/i.test(
        turn.text,
      ),
  );

const lastPlayerTurnText = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue
    .slice()
    .reverse()
    .find((turn) => turn.speaker === 'player')?.text ?? '';

const hasInventoryItem = (input: NpcBrainInput, itemId: string) =>
  input.playerState.inventory.some((entry) => entry.itemId === itemId && entry.quantity > 0);

const buildHistoryCue = (input: NpcBrainInput) => {
  const cues: string[] = [];

  if (input.playerModel.recentQuestChoices.some((choice) => choice.includes('rowan'))) {
    cues.push('你之前已经偏向了罗文那条协防路线。');
  }

  if (input.playerModel.recentAreaVisits.includes(mockIds.areas.archive)) {
    cues.push('你从沉没秘库带回来的线索还在改变局势。');
  }

  if (input.recentDialogue.length >= 4) {
    cues.push('你已经把这条线反复确认过了。');
  }

  if (cues.length > 0) {
    return cues.join('');
  }

  if (input.npcState.memory.shortTerm.length > 0) {
    return `我还记得：${input.npcState.memory.shortTerm[input.npcState.memory.shortTerm.length - 1]}`;
  }

  return '这次交谈会决定下一步的节奏。';
};

const buildDecisionBasis = (
  input: NpcBrainInput,
  intent: ReturnType<typeof deriveIntent>,
  supportiveTone: boolean,
  aggressiveTone: boolean,
) => {
  const reasons: string[] = [
    `当前交互意图是${intent === 'greet'
      ? '问候'
      : intent === 'ask'
        ? '询问'
        : intent === 'trade'
          ? '交易'
          : intent === 'quest'
            ? '任务'
            : intent === 'persuade'
              ? '说服'
              : '离开'}`,
  ];

  if (supportiveTone) {
    reasons.push('玩家语气更偏合作，NPC 会下调戒备');
  }

  if (aggressiveTone) {
    reasons.push('玩家语气偏强硬，NPC 会优先保护信息');
  }

  if (input.playerModel.recentQuestChoices.some((choice) => choice.includes('rowan'))) {
    reasons.push('玩家最近偏向罗文线，NPC 会参考既有协作倾向');
  }

  if (input.playerModel.recentAreaVisits.includes(mockIds.areas.archive)) {
    reasons.push('玩家近期到过沉没秘库，相关线索会影响回答');
  }

  if (input.recentDialogue.length >= 4) {
    reasons.push('当前已经进入多轮对话，NPC 会压缩重复信息');
  }

  return reasons.slice(0, 4);
};

const buildQuestOffers = (input: NpcBrainInput) =>
  input.questDefinitions
    .filter((quest) => quest.giverNpcId === input.npcDefinition.id)
    .filter((quest) => {
      const progress = input.questProgressEntries.find(
        (entry) => entry.questId === quest.id,
      );

      return (
        progress?.status === 'available' &&
        !input.npcState.hasGivenQuestIds.includes(quest.id)
      );
    })
    .map((quest) => quest.id);

const buildTradeOutcome = (
  input: NpcBrainInput,
): Pick<NpcBrainOutput, 'itemTransfers' | 'playerGoldDelta'> => {
  if (input.npcDefinition.role === 'merchant' && input.playerState.gold >= 6) {
    return {
      itemTransfers: [
        {
          itemId: 'item:ember-salve',
          quantity: 1,
          direction: 'to-player',
        },
      ],
      playerGoldDelta: -6,
    };
  }

  if (
    input.npcDefinition.role === 'scholar' &&
    hasInventoryItem(input, 'item:sealed-relic')
  ) {
    return {
      itemTransfers: [
        {
          itemId: 'item:sealed-relic',
          quantity: 1,
          direction: 'from-player',
        },
        {
          itemId: 'item:archive-pass',
          quantity: 1,
          direction: 'to-player',
        },
      ],
      playerGoldDelta: 0,
    };
  }

  if (
    input.npcDefinition.role === 'guard' &&
    input.npcState.trust >= 25 &&
    !hasInventoryItem(input, 'item:archive-pass')
  ) {
    return {
      itemTransfers: [
        {
          itemId: 'item:archive-pass',
          quantity: 1,
          direction: 'to-player',
        },
      ],
      playerGoldDelta: 0,
    };
  }

  return {
    itemTransfers: [],
    playerGoldDelta: 0,
  };
};

const buildNetworkChanges = (
  input: NpcBrainInput,
  intent: string,
) => {
  if (intent === 'quest' && input.npcDefinition.role === 'guide') {
    return [
      {
        targetNpcId: mockIds.npcs.rowan,
        delta: 6,
        bond: '协防链路',
      },
    ];
  }

  if (intent === 'trade' && input.npcDefinition.role === 'merchant') {
    return [
      {
        targetNpcId: mockIds.npcs.lyra,
        delta: 4,
        bond: '补给协作',
      },
    ];
  }

  if (
    intent === 'ask' &&
    input.npcDefinition.role === 'scholar' &&
    input.playerModel.recentAreaVisits.includes(mockIds.areas.archive)
  ) {
    return [
      {
        targetNpcId: mockIds.npcs.rowan,
        delta: 3,
        bond: '情报共享',
      },
    ];
  }

  return [];
};

const deriveIntent = (recentDialogue: NpcBrainInput['recentDialogue']) => {
  const text = lastPlayerTurnText(recentDialogue);

  if (/(交换|物资|补给|trade|货)/i.test(text)) {
    return 'trade';
  }

  if (/(任务|委托|mission|quest)/i.test(text)) {
    return 'quest';
  }

  if (/(相信|说服|persuade|稳住)/i.test(text)) {
    return 'persuade';
  }

  if (/(线索|情报|告诉我|ask|remember)/i.test(text)) {
    return 'ask';
  }

  if (/(稍后|先走|leave)/i.test(text)) {
    return 'leave';
  }

  return 'greet';
};

export class MockNpcBrainAgent
  extends ValidatedMockAgent<NpcBrainInput, NpcBrainOutput>
  implements NpcBrainAgent
{
  constructor() {
    super('npc-brain', npcBrainInputSchema, npcBrainOutputSchema);
  }

  protected execute(input: NpcBrainInput): NpcBrainOutput {
    const intent = deriveIntent(input.recentDialogue);
    const supportiveTone = hasSupportiveTone(input.recentDialogue);
    const aggressiveTone = hasAggressiveTone(input.recentDialogue);
    const baseDeltas: Record<
      ReturnType<typeof deriveIntent>,
      { trustDelta: number; relationshipDelta: number }
    > = {
      greet: { trustDelta: 1, relationshipDelta: 1 },
      ask: { trustDelta: 1, relationshipDelta: 0 },
      trade: { trustDelta: 0, relationshipDelta: 1 },
      quest: { trustDelta: 2, relationshipDelta: 1 },
      persuade: { trustDelta: 2, relationshipDelta: 2 },
      leave: { trustDelta: 0, relationshipDelta: 0 },
    };
    let trustDelta = baseDeltas[intent].trustDelta;
    let relationshipDelta = baseDeltas[intent].relationshipDelta;

    if (supportiveTone) {
      trustDelta += 3;
      relationshipDelta += 2;
    }

    if (aggressiveTone) {
      trustDelta -= 5;
      relationshipDelta -= 6;
    }

    const questOfferIds = intent === 'quest' ? buildQuestOffers(input) : [];
    const tradeOutcome = intent === 'trade' ? buildTradeOutcome(input) : { itemTransfers: [], playerGoldDelta: 0 };
    const relationshipNetworkChanges = buildNetworkChanges(input, intent);
    const historyCue = buildHistoryCue(input);
    const decisionBasis = buildDecisionBasis(
      input,
      intent,
      supportiveTone,
      aggressiveTone,
    );

    const npcReply = aggressiveTone
      ? `${input.npcDefinition.name}收紧语气，明显不满地说：“${historyCue}如果你继续这样逼问，我只会把消息收得更紧。”`
      : intent === 'quest' && questOfferIds.length > 0
        ? `${input.npcDefinition.name}点了点头：“${historyCue}这份委托现在交给你，别让它断在路上。”`
        : intent === 'trade' && tradeOutcome.itemTransfers.length > 0
          ? `${input.npcDefinition.name}压低声音：“${historyCue}这批物资我先给你，但别把路线上交代的缺口再放大。”`
          : intent === 'ask'
            ? `${input.npcDefinition.name}沉吟片刻：“${historyCue}我会按你之前留下的行动痕迹来判断能告诉你多少。”`
            : intent === 'persuade'
              ? `${input.npcDefinition.name}重新审视了你一眼：“${historyCue}如果你真能稳住局势，我愿意再把一步棋交给你。”`
              : intent === 'leave'
                ? `${input.npcDefinition.name}没有拦你，只留下了一句提醒：“${historyCue}别让这条线在你离开后冷掉。”`
                : `${input.npcDefinition.name}的神情略微放松：“${historyCue}先把节奏对齐，我们再往下谈。”`;

    return {
      npcReply,
      trustDelta,
      relationshipDelta,
      memoryNote: `${input.npcDefinition.name}记下了这次以“${intent}”为主的对话回应。`,
      longTermMemoryNote:
        questOfferIds.length > 0 || relationshipNetworkChanges.length > 0
          ? `${input.npcDefinition.name}认为玩家正在影响更大的协作网络。`
          : supportiveTone
            ? `${input.npcDefinition.name}对玩家的长期评价略有上升。`
            : undefined,
      questOfferIds,
      itemTransfers: tradeOutcome.itemTransfers,
      playerGoldDelta: tradeOutcome.playerGoldDelta,
      relationshipNetworkChanges,
      decisionBasis,
      explanationHint: `${input.npcDefinition.name}根据玩家最近的区域行动、任务偏好与当前对话语气调整了回应。`,
    };
  }
}
