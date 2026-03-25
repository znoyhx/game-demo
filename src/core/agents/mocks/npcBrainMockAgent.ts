import {
  npcBrainInputSchema,
  npcBrainOutputSchema,
  type NpcBrainInput,
  type NpcBrainOutput,
} from '../../schemas';
import { mockIds } from '../../mocks/mvp';
import { resolveNpcReactionBias } from '../../rules';

import type { NpcBrainAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const hasSupportiveTone = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue.some(
    (turn) =>
      turn.speaker === 'player' &&
      /(help|aid|support|quest|team|帮|协助|支持|一起|合作|任务)/i.test(turn.text),
  );

const hasAggressiveTone = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue.some(
    (turn) =>
      turn.speaker === 'player' &&
      /(demand|threat|force|now|立刻|命令|威胁|交出来|马上)/i.test(turn.text),
  );

const lastPlayerTurnText = (recentDialogue: NpcBrainInput['recentDialogue']) =>
  recentDialogue
    .slice()
    .reverse()
    .find((turn) => turn.speaker === 'player')?.text ?? '';

const hasInventoryItem = (input: NpcBrainInput, itemId: string) =>
  input.playerState.inventory.some((entry) => entry.itemId === itemId && entry.quantity > 0);

const intentLabels = {
  greet: '寒暄',
  ask: '询问',
  trade: '交易',
  quest: '任务',
  persuade: '说服',
  leave: '结束对话',
} as const;

const buildHistoryCue = (input: NpcBrainInput) => {
  const cues: string[] = [];

  if (input.playerModel.recentQuestChoices.some((choice) => choice.includes('rowan'))) {
    cues.push('你之前在 Rowan 的分支上做过关键选择。');
  }

  if (input.playerModel.recentAreaVisits.includes(mockIds.areas.archive)) {
    cues.push('你最近去过沉没档案馆，这让对方更愿意把话题往那边引。');
  }

  if (input.recentDialogue.length >= 4) {
    cues.push('这次对话已经持续了一会儿，对方会更明显地回应你的态度。');
  }

  if (cues.length > 0) {
    return cues.join('');
  }

  if (input.npcState.memory.shortTerm.length > 0) {
    return `对方还记得上次互动留下的印象：${input.npcState.memory.shortTerm[input.npcState.memory.shortTerm.length - 1]}`;
  }

  return '对方会根据你当前的态度和近期行为给出回应。';
};

const buildDecisionBasis = (
  input: NpcBrainInput,
  intent: ReturnType<typeof deriveIntent>,
  supportiveTone: boolean,
  aggressiveTone: boolean,
  playerModelBias: ReturnType<typeof resolveNpcReactionBias>,
) => {
  const reasons: string[] = [`玩家本轮意图偏向“${intentLabels[intent]}”。`];

  if (supportiveTone) {
    reasons.push('玩家这轮表达更合作，因此 NPC 更容易给出正面反馈。');
  }

  if (aggressiveTone) {
    reasons.push('玩家这轮表达更强硬，因此 NPC 会提高防备。');
  }

  if (input.playerModel.recentQuestChoices.some((choice) => choice.includes('rowan'))) {
    reasons.push('NPC 识别到玩家之前在 Rowan 相关支线中的选择。');
  }

  if (input.playerModel.recentAreaVisits.includes(mockIds.areas.archive)) {
    reasons.push('玩家近期去过沉没档案馆，这改变了 NPC 对当前话题的判断。');
  }

  reasons.push(...playerModelBias.reasons);

  return reasons.slice(0, 5);
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
  intent: ReturnType<typeof deriveIntent>,
) => {
  if (intent === 'quest' && input.npcDefinition.role === 'guide') {
    return [
      {
        targetNpcId: mockIds.npcs.rowan,
        delta: 6,
        bond: '并肩侦察',
      },
    ];
  }

  if (intent === 'trade' && input.npcDefinition.role === 'merchant') {
    return [
      {
        targetNpcId: mockIds.npcs.lyra,
        delta: 4,
        bond: '互通商路',
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
        bond: '档案线索',
      },
    ];
  }

  return [];
};

const deriveIntent = (input: NpcBrainInput) => {
  if (input.selectedIntent) {
    return input.selectedIntent;
  }

  const { recentDialogue } = input;
  const text = lastPlayerTurnText(recentDialogue);

  if (/(trade|买|卖|交易|补给|商店)/i.test(text)) {
    return 'trade';
  }

  if (/(mission|quest|任务|委托|线索)/i.test(text)) {
    return 'quest';
  }

  if (/(persuade|说服|请求|相信我|拜托)/i.test(text)) {
    return 'persuade';
  }

  if (/(ask|remember|问|情况|发生了什么|记得)/i.test(text)) {
    return 'ask';
  }

  if (/(leave|再见|先走了|告辞)/i.test(text)) {
    return 'leave';
  }

  return 'greet';
};

const buildNpcReply = (options: {
  input: NpcBrainInput;
  intent: ReturnType<typeof deriveIntent>;
  aggressiveTone: boolean;
  questOfferIds: string[];
  tradeOutcome: Pick<NpcBrainOutput, 'itemTransfers' | 'playerGoldDelta'>;
  historyCue: string;
}) => {
  const { input, intent, aggressiveTone, questOfferIds, tradeOutcome, historyCue } = options;

  if (aggressiveTone) {
    return `${input.npcDefinition.name}皱起眉头：“你的态度太急了。${historyCue} 先把语气放缓，我们再谈。”`;
  }

  if (intent === 'quest' && questOfferIds.length > 0) {
    return `${input.npcDefinition.name}点头道：“既然你愿意接手，我这里正好有一条线索。${historyCue} 这件事交给你试试看。”`;
  }

  if (intent === 'trade' && tradeOutcome.itemTransfers.length > 0) {
    return `${input.npcDefinition.name}把货物推了过来：“可以，这笔交易我做。${historyCue} 你带着它会更稳妥。”`;
  }

  if (intent === 'ask') {
    return `${input.npcDefinition.name}压低声音：“你问到点子上了。${historyCue} 我能告诉你的，比普通访客更多一点。”`;
  }

  if (intent === 'persuade') {
    return `${input.npcDefinition.name}沉吟片刻：“你说得不是没有道理。${historyCue} 但我要先确认你是不是值得信任。”`;
  }

  if (intent === 'leave') {
    return `${input.npcDefinition.name}轻轻点头：“那就先到这里。${historyCue} 需要时再来找我。”`;
  }

  return `${input.npcDefinition.name}抬头看向你：“来得正好。${historyCue} 你想先聊哪一件事？”`;
};

export class MockNpcBrainAgent
  extends ValidatedMockAgent<NpcBrainInput, NpcBrainOutput>
  implements NpcBrainAgent
{
  constructor() {
    super('npc-brain', npcBrainInputSchema, npcBrainOutputSchema);
  }

  protected execute(input: NpcBrainInput): NpcBrainOutput {
    const intent = deriveIntent(input);
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
    const playerModelBias = resolveNpcReactionBias(input.playerModel, intent);
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

    trustDelta += playerModelBias.trustDelta;
    relationshipDelta += playerModelBias.relationshipDelta;

    const questOfferIds = intent === 'quest' ? buildQuestOffers(input) : [];
    const tradeOutcome =
      intent === 'trade'
        ? buildTradeOutcome(input)
        : { itemTransfers: [], playerGoldDelta: 0 };
    const relationshipNetworkChanges = buildNetworkChanges(input, intent);
    const historyCue = buildHistoryCue(input);
    const decisionBasis = buildDecisionBasis(
      input,
      intent,
      supportiveTone,
      aggressiveTone,
      playerModelBias,
    );
    const npcReply = buildNpcReply({
      input,
      intent,
      aggressiveTone,
      questOfferIds,
      tradeOutcome,
      historyCue,
    });

    return {
      npcReply,
      trustDelta,
      relationshipDelta,
      memoryNote: `${input.npcDefinition.name}记录了玩家本轮“${intentLabels[intent]}”的交互倾向。`,
      longTermMemoryNote:
        questOfferIds.length > 0 || relationshipNetworkChanges.length > 0
          ? `${input.npcDefinition.name}记住了这次关键互动，后续会据此调整长期态度。`
          : supportiveTone
            ? `${input.npcDefinition.name}对玩家留下了积极合作的长期印象。`
            : undefined,
      questOfferIds,
      itemTransfers: tradeOutcome.itemTransfers,
      playerGoldDelta: tradeOutcome.playerGoldDelta,
      relationshipNetworkChanges,
      decisionBasis,
      explanationHint: `${input.npcDefinition.name}会结合玩家当前语气、近期画像与既往记忆来决定回应方式。`,
    };
  }
}
