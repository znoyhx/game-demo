import type { NpcDialogueIntent, NpcRelationshipNetworkChange, NpcTradeTransfer } from '../../schemas';

const itemLabels: Record<string, string> = {
  'item:ember-salve': '余烬药膏',
  'item:archive-pass': '秘库通行证',
  'item:sealed-relic': '封印遗物',
  'item:ember-resin': '余烬树脂',
  'item:dustbloom': '尘华花',
  'item:cindersage': '灰尾草',
  'item:cinder-tonic': '炽火药剂',
  'item:relay-core-fragment': '中继核心碎片',
};

const bondFallbackLabel = '关系网络';

const formatItemLabel = (itemId: string) => itemLabels[itemId] ?? itemId.replace(/^item:/, '');

const formatSignedValue = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

export const npcInteractionText = {
  dialogueOptions: {
    greet: '山谷局势还在恶化，我们先把行动协调好。',
    ask: '把上一次行动后你记住的线索告诉我。',
    trade: '把现在能交换的物资拿出来吧。',
    quest: '如果你还有要交给我的任务，就现在说。',
    persuade: '相信我，这件事我能稳住。',
    leave: '我先去处理眼前的路线，稍后再来。',
  } satisfies Record<NpcDialogueIntent, string>,
  openingLine: (
    npcName: string,
    emotionalState: string,
    currentGoal: string | undefined,
  ) =>
    currentGoal
      ? `${npcName}维持着${emotionalState}的神情，低声提醒：${currentGoal}`
      : `${npcName}正观察你的下一步动作，等待你开口。`,
  infoRevealLine: (fact: string) => `新增线索：${fact}`,
  secretRevealLine: (secret: string) => `隐秘情报：${secret}`,
  questIssuedLine: (questTitle: string) => `任务已发放：${questTitle}`,
  tradeGoldLine: (goldDelta: number) =>
    goldDelta < 0
      ? `你支付了 ${Math.abs(goldDelta)} 枚金币。`
      : `你获得了 ${goldDelta} 枚金币。`,
  tradeItemLine: (transfer: NpcTradeTransfer) =>
    transfer.direction === 'to-player'
      ? `你获得了 ${transfer.quantity} 份${formatItemLabel(transfer.itemId)}。`
      : `你交出了 ${transfer.quantity} 份${formatItemLabel(transfer.itemId)}。`,
  noTradeLine: (npcName: string) => `${npcName}暂时没有愿意交换的物资。`,
  networkChangeLine: (
    targetNpcName: string,
    change: NpcRelationshipNetworkChange,
  ) =>
    `${targetNpcName} 的${change.bond ?? bondFallbackLabel}已调整 ${formatSignedValue(change.delta)}。`,
  interactionSummaryLine: (npcName: string, trustDelta: number, relationshipDelta: number) =>
    `${npcName}的信任变化 ${formatSignedValue(trustDelta)}，关系变化 ${formatSignedValue(relationshipDelta)}。`,
  changeReasonLine: (metricLabel: string, reasons: string[]) =>
    `${metricLabel}变化原因：${reasons.join('；')}`,
  talkTriggerNote: (npcName: string) => `与 ${npcName} 的对话推进了相关任务线。`,
};
