import type {
  NpcDialogueIntent,
  NpcInteractionExplanation,
  NpcDisposition,
  NpcEmotionalState,
  NpcRelationshipNetworkChange,
  NpcRelationshipNetworkEdge,
  NpcState,
  NpcTradeTransfer,
  PlayerInventoryEntry,
  PlayerState,
} from '../schemas';
import { npcInteractionExplanationSchema } from '../schemas';
import {
  formatNpcDialogueIntentLabel,
  formatNpcDispositionLabel,
  formatNpcEmotionalStateLabel,
} from '../utils/displayLabels';

import { failRule, passRule, type RuleResult } from './ruleResult';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const appendBoundedUnique = (
  entries: string[],
  nextEntry: string | undefined,
  limit: number,
) => {
  if (!nextEntry) {
    return entries;
  }

  return [...new Set([...entries, nextEntry])].slice(-limit);
};

const appendManyUnique = (entries: string[], additions: string[]) =>
  [...new Set([...entries, ...additions])];

const buildUniqueReasons = (reasons: Array<string | undefined>) =>
  Array.from(
    new Set(
      reasons
        .map((reason) => reason?.trim())
        .filter((reason): reason is string => Boolean(reason)),
    ),
  );

const mergeRelationshipNetwork = (
  relationshipNetwork: NpcRelationshipNetworkEdge[],
  changes: NpcRelationshipNetworkChange[],
) => {
  const nextNetwork = new Map(
    relationshipNetwork.map((edge) => [edge.targetNpcId, edge]),
  );

  changes.forEach((change) => {
    const previousEdge = nextNetwork.get(change.targetNpcId);
    nextNetwork.set(change.targetNpcId, {
      targetNpcId: change.targetNpcId,
      bond: change.bond ?? previousEdge?.bond ?? '关联',
      strength: clamp(
        (previousEdge?.strength ?? 0) + change.delta,
        -100,
        100,
      ),
    });
  });

  return Array.from(nextNetwork.values());
};

const setInventoryQuantity = (
  inventory: Map<string, number>,
  itemId: string,
  quantity: number,
) => {
  if (quantity <= 0) {
    inventory.delete(itemId);
    return;
  }

  inventory.set(itemId, quantity);
};

const inventoryMapToList = (
  inventory: Map<string, number>,
): PlayerInventoryEntry[] =>
  Array.from(inventory.entries()).map(([itemId, quantity]) => ({
    itemId,
    quantity,
  }));

export const deriveNpcDisposition = (
  relationship: number,
  trust: number,
  currentDisposition: NpcDisposition,
  emotionalState?: NpcEmotionalState,
): NpcDisposition => {
  if (relationship <= -40) {
    return 'hostile';
  }

  if (emotionalState === 'fearful' && trust < 20) {
    return 'afraid';
  }

  if (emotionalState === 'angry' && relationship < 15) {
    return relationship < 0 ? 'hostile' : 'suspicious';
  }

  if (emotionalState === 'wary' && trust < 25 && currentDisposition === 'secretive') {
    return 'secretive';
  }

  if (trust <= 10) {
    return relationship < 0 ? 'hostile' : 'suspicious';
  }

  if (relationship >= 35 || trust >= 55) {
    return 'friendly';
  }

  if (trust >= 25 || relationship >= 10) {
    return 'neutral';
  }

  if (currentDisposition === 'hostile' && relationship < 0) {
    return 'hostile';
  }

  return currentDisposition === 'secretive' ? 'secretive' : 'suspicious';
};

export const deriveNpcEmotionalState = (
  currentEmotion: NpcEmotionalState,
  intent: NpcDialogueIntent | undefined,
  trustDelta: number,
  relationshipDelta: number,
  nextTrust: number,
  nextRelationship: number,
): NpcEmotionalState => {
  if (trustDelta <= -4 || relationshipDelta <= -5) {
    return nextTrust < 15 ? 'angry' : 'tense';
  }

  if (intent === 'trade') {
    return nextTrust >= 30 ? 'calm' : 'wary';
  }

  if (trustDelta >= 4 && relationshipDelta >= 3) {
    return 'grateful';
  }

  if (intent === 'quest' && nextTrust >= 25) {
    return 'resolute';
  }

  if (nextTrust >= 55 || nextRelationship >= 35) {
    return 'hopeful';
  }

  if (nextTrust <= 12) {
    return 'fearful';
  }

  if (intent === 'ask' || intent === 'persuade') {
    return nextTrust >= 25 ? 'calm' : 'wary';
  }

  if (currentEmotion === 'angry' && trustDelta >= 0) {
    return 'wary';
  }

  return currentEmotion;
};

export interface NpcRelationUpdateResult extends RuleResult {
  state: NpcState;
  trustDelta: number;
  relationshipDelta: number;
}

export interface NpcKnowledgeDisclosureResult extends RuleResult {
  facts: string[];
  secrets: string[];
}

export interface PlayerTradeUpdateResult extends RuleResult {
  playerState: PlayerState;
}

export interface NpcInteractionStateChangeResult extends RuleResult {
  state: NpcState;
  trustDelta: number;
  relationshipDelta: number;
  disclosedFacts: string[];
  disclosedSecrets: string[];
}

export const resolveNpcKnowledgeDisclosure = (
  npcState: NpcState,
  intent: NpcDialogueIntent,
): NpcKnowledgeDisclosureResult => {
  if (intent === 'greet' || intent === 'leave') {
    return {
      ...passRule('npc greeting does not reveal gated info'),
      facts: [],
      secrets: [],
    };
  }

  const undisclosedPublicFacts = npcState.revealableInfo.publicFacts.filter(
    (fact) => !npcState.revealedFacts.includes(fact),
  );
  const undisclosedTrustFacts = npcState.revealableInfo.trustGatedFacts
    .filter(
      (entry) =>
        entry.minTrust <= npcState.trust &&
        !npcState.revealedFacts.includes(entry.fact),
    )
    .map((entry) => entry.fact);
  const undisclosedSecrets = npcState.revealableInfo.hiddenSecrets.filter(
    (secret) => !npcState.revealedSecrets.includes(secret),
  );

  const factQueue =
    intent === 'quest' || intent === 'persuade'
      ? [...undisclosedTrustFacts, ...undisclosedPublicFacts]
      : [...undisclosedPublicFacts, ...undisclosedTrustFacts];
  const facts =
    intent === 'trade' ? factQueue.slice(0, 1) : factQueue.slice(0, 2);
  const secrets =
    npcState.trust >= 60 &&
    npcState.relationship >= 25 &&
    (intent === 'ask' || intent === 'quest' || intent === 'persuade')
      ? undisclosedSecrets.slice(0, 1)
      : [];

  return {
    ...passRule('npc disclosure resolved'),
    facts,
    secrets,
  };
};

export const buildNpcInteractionExplanation = (options: {
  npcId: string;
  npcName: string;
  beforeState: NpcState;
  afterState: NpcState;
  intent: NpcDialogueIntent;
  questOfferIds: string[];
  disclosedFacts: string[];
  disclosedSecrets: string[];
  relationshipNetworkChanges: NpcRelationshipNetworkChange[];
  itemTransfers: NpcTradeTransfer[];
  playerGoldDelta: number;
  decisionBasis: string[];
  explanationHint?: string;
}): NpcInteractionExplanation => {
  const trustDelta = options.afterState.trust - options.beforeState.trust;
  const relationshipDelta =
    options.afterState.relationship - options.beforeState.relationship;
  const disclosedInfo = [
    ...options.disclosedFacts,
    ...options.disclosedSecrets,
  ];

  const trustReasons = buildUniqueReasons([
    trustDelta > 0
      ? `${formatNpcDialogueIntentLabel(options.intent)}回应让对方更愿意继续合作`
      : undefined,
    trustDelta < 0
      ? '本轮交谈提高了对方的戒备'
      : undefined,
    options.questOfferIds.length > 0 ? '对方愿意把任务交到你手上' : undefined,
    options.disclosedSecrets.length > 0 ? '隐秘情报只会交给更被信任的人' : undefined,
    options.itemTransfers.length > 0 || options.playerGoldDelta !== 0
      ? '完成物资交接后，对方对执行力更有把握'
      : undefined,
    options.decisionBasis.find((reason) => /强硬|施压|逼问|戒备/.test(reason))
      ? '强硬语气会直接压低信任'
      : undefined,
  ]);

  const relationshipReasons = buildUniqueReasons([
    relationshipDelta > 0
      ? `${formatNpcDialogueIntentLabel(options.intent)}让共同目标更明确`
      : undefined,
    relationshipDelta < 0 ? '这次互动削弱了协作意愿' : undefined,
    options.itemTransfers.length > 0 || options.playerGoldDelta !== 0
      ? '物资交换推动了合作关系'
      : undefined,
    options.relationshipNetworkChanges.length > 0
      ? '这次互动影响到了其他 NPC 的关系网络'
      : undefined,
    options.disclosedFacts.length > 0 ? '共享线索会拉近关系距离' : undefined,
  ]);

  const decisionBasis = buildUniqueReasons([
    ...options.decisionBasis,
    options.explanationHint,
    disclosedInfo.length > 0 ? `本轮额外公开了 ${disclosedInfo.length} 条信息` : undefined,
    options.relationshipNetworkChanges.length > 0
      ? `关系网络同步调整 ${options.relationshipNetworkChanges.length} 条`
      : undefined,
  ]).slice(0, 4);

  return npcInteractionExplanationSchema.parse({
    npcId: options.npcId,
    npcName: options.npcName,
    attitudeLabel: formatNpcDispositionLabel(options.afterState.currentDisposition),
    emotionalStateLabel: formatNpcEmotionalStateLabel(options.afterState.emotionalState),
    trust: {
      before: options.beforeState.trust,
      after: options.afterState.trust,
      delta: trustDelta,
      reasons: trustReasons,
    },
    relationship: {
      before: options.beforeState.relationship,
      after: options.afterState.relationship,
      delta: relationshipDelta,
      reasons: relationshipReasons,
    },
    decisionBasis,
    disclosedInfo,
    debugSummary: buildUniqueReasons([
      `当前态度 ${formatNpcDispositionLabel(options.afterState.currentDisposition)}`,
      `情绪 ${formatNpcEmotionalStateLabel(options.afterState.emotionalState)}`,
      trustReasons[0],
      relationshipReasons[0],
    ]).join('；'),
  });
};

export const applyNpcInteractionStateChange = (
  npcState: NpcState,
  options: {
    trustDelta?: number;
    relationshipDelta?: number;
    memoryNote?: string;
    longTermMemoryNote?: string;
    timestamp: string;
    intent?: NpcDialogueIntent;
    disclosedFacts?: string[];
    disclosedSecrets?: string[];
    issuedQuestIds?: string[];
    relationshipNetworkChanges?: NpcRelationshipNetworkChange[];
  },
): NpcInteractionStateChangeResult => {
  const trustDelta = options.trustDelta ?? 0;
  const relationshipDelta = options.relationshipDelta ?? 0;
  const trust = clamp(npcState.trust + trustDelta, 0, 100);
  const relationship = clamp(
    npcState.relationship + relationshipDelta,
    -100,
    100,
  );
  const emotionalState = deriveNpcEmotionalState(
    npcState.emotionalState,
    options.intent,
    trustDelta,
    relationshipDelta,
    trust,
    relationship,
  );
  const currentDisposition = deriveNpcDisposition(
    relationship,
    trust,
    npcState.currentDisposition,
    emotionalState,
  );

  const state: NpcState = {
    ...npcState,
    trust,
    relationship,
    currentDisposition,
    emotionalState,
    memory: {
      ...npcState.memory,
      shortTerm: appendBoundedUnique(
        npcState.memory.shortTerm,
        options.memoryNote,
        5,
      ),
      longTerm: appendBoundedUnique(
        npcState.memory.longTerm,
        options.longTermMemoryNote,
        8,
      ),
      lastInteractionAt: options.timestamp,
    },
    revealedFacts: appendManyUnique(
      npcState.revealedFacts,
      options.disclosedFacts ?? [],
    ),
    revealedSecrets: appendManyUnique(
      npcState.revealedSecrets,
      options.disclosedSecrets ?? [],
    ),
    relationshipNetwork: mergeRelationshipNetwork(
      npcState.relationshipNetwork,
      options.relationshipNetworkChanges ?? [],
    ),
    hasGivenQuestIds: appendManyUnique(
      npcState.hasGivenQuestIds,
      options.issuedQuestIds ?? [],
    ),
  };

  return {
    ...passRule('npc interaction state updated'),
    state,
    trustDelta,
    relationshipDelta,
    disclosedFacts: options.disclosedFacts ?? [],
    disclosedSecrets: options.disclosedSecrets ?? [],
  };
};

export const applyNpcRelationChange = (
  npcState: NpcState,
  options: {
    trustDelta?: number;
    relationshipDelta?: number;
    memoryNote?: string;
    timestamp: string;
  },
): NpcRelationUpdateResult => {
  const result = applyNpcInteractionStateChange(npcState, options);

  return {
    ...passRule('npc relation updated'),
    state: result.state,
    trustDelta: result.trustDelta,
    relationshipDelta: result.relationshipDelta,
  };
};

export const applyNpcItemExchange = (
  playerState: PlayerState,
  itemTransfers: NpcTradeTransfer[],
  playerGoldDelta = 0,
): PlayerTradeUpdateResult => {
  const inventory = new Map(
    playerState.inventory.map((entry) => [entry.itemId, entry.quantity]),
  );
  const nextGold = playerState.gold + playerGoldDelta;

  if (nextGold < 0) {
    return {
      ...failRule('玩家金币不足，无法完成这次交换'),
      playerState,
    };
  }

  for (const transfer of itemTransfers) {
    if (transfer.direction === 'from-player') {
      const currentQuantity = inventory.get(transfer.itemId) ?? 0;
      if (currentQuantity < transfer.quantity) {
        return {
          ...failRule(`玩家缺少 ${transfer.itemId}，无法完成交换`),
          playerState,
        };
      }

      setInventoryQuantity(
        inventory,
        transfer.itemId,
        currentQuantity - transfer.quantity,
      );
      continue;
    }

    setInventoryQuantity(
      inventory,
      transfer.itemId,
      (inventory.get(transfer.itemId) ?? 0) + transfer.quantity,
    );
  }

  return {
    ...passRule('npc trade applied'),
    playerState: {
      ...playerState,
      gold: nextGold,
      inventory: inventoryMapToList(inventory),
    },
  };
};
