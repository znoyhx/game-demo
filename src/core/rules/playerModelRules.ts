import type {
  CombatCommandAction,
  DifficultyLevel,
  EnemyTacticType,
  NpcDialogueIntent,
  PlayerModelInput,
  PlayerModelOutput,
  PlayerModelSignalWeights,
  PlayerModelState,
  PlayerProfileTag,
} from '../schemas';
import { createEmptyPlayerModelSignalWeights } from '../schemas';
import { getCombatTuningPreset } from '../config';

const PLAYER_MODEL_TAG_ORDER: PlayerProfileTag[] = [
  'exploration',
  'combat',
  'social',
  'story',
  'speedrun',
  'cautious',
  'risky',
];

const DOMAIN_TAGS: PlayerProfileTag[] = [
  'exploration',
  'combat',
  'social',
  'story',
  'speedrun',
];

export const PLAYER_MODEL_HISTORY_LIMIT = 8;

export interface PlayerModelRuleEvaluation extends PlayerModelOutput {
  dominantStyle?: PlayerProfileTag;
  tagScores: Record<PlayerProfileTag, number>;
}

export interface PlayerDifficultyAdjustment {
  enemyHpMultiplier: number;
  label: string;
  summary: string;
  tier: 'assist' | 'steady' | 'pressure';
}

export interface PlayerGuidanceHint {
  id: string;
  title: string;
  summary: string;
  tone: 'default' | 'success' | 'warning' | 'info';
}

export interface PlayerNpcReactionBias {
  trustDelta: number;
  relationshipDelta: number;
  reasons: string[];
}

export interface PlayerEnemyCounterStrategyBias {
  tacticPriorities: EnemyTacticType[];
  reasons: string[];
}

export interface PlayerSystemReactionPreview {
  difficulty: PlayerDifficultyAdjustment;
  hints: PlayerGuidanceHint[];
  npcReaction: PlayerNpcReactionBias;
  enemyStrategy: PlayerEnemyCounterStrategyBias;
}

const riskyQuestChoicePattern = /(rush|risk|force|power|sacrifice|pressure|raid|speedrun|skip|fast|direct)/i;
const cautiousQuestChoicePattern = /(careful|safe|observe|prepare|guard|support|recon|ally|trust)/i;
const socialQuestChoicePattern = /(trust|ally|support|talk|negotiate|trade|persuade|help)/i;

const appendRecentHistory = <T>(
  history: T[],
  entry: T,
  limit = PLAYER_MODEL_HISTORY_LIMIT,
) => [...history, entry].slice(-limit);

const clampEnemyHpMultiplier = (
  value: number,
  minimum: number,
  maximum: number,
) => Math.max(minimum, Math.min(maximum, Number(value.toFixed(2))));

const normalizeTags = (
  tags: PlayerProfileTag[],
  scores: Record<PlayerProfileTag, number>,
) =>
  [...new Set(tags)].sort((left, right) => {
    if (scores[right] !== scores[left]) {
      return scores[right] - scores[left];
    }

    return PLAYER_MODEL_TAG_ORDER.indexOf(left) - PLAYER_MODEL_TAG_ORDER.indexOf(right);
  });

const mergeSignalWeightDeltas = (
  signalWeights: PlayerModelSignalWeights,
  deltas: Partial<Record<PlayerProfileTag, number>>,
): PlayerModelSignalWeights =>
  PLAYER_MODEL_TAG_ORDER.reduce<PlayerModelSignalWeights>((nextWeights, tag) => {
    const delta = deltas[tag] ?? 0;

    if (delta === 0) {
      return nextWeights;
    }

    return {
      ...nextWeights,
      [tag]: Math.max(0, nextWeights[tag] + delta),
    };
  }, signalWeights);

const countMatchingActions = (
  actions: CombatCommandAction[],
  candidates: CombatCommandAction[],
) => actions.filter((action) => candidates.includes(action)).length;

const countMatchingIntents = (
  intents: NpcDialogueIntent[],
  candidates: NpcDialogueIntent[],
) => intents.filter((intent) => candidates.includes(intent)).length;

const buildTopDomainTags = (scores: Record<PlayerProfileTag, number>) => {
  const rankedTags = [...DOMAIN_TAGS].sort((left, right) => {
    if (scores[right] !== scores[left]) {
      return scores[right] - scores[left];
    }

    return PLAYER_MODEL_TAG_ORDER.indexOf(left) - PLAYER_MODEL_TAG_ORDER.indexOf(right);
  });
  const topScore = scores[rankedTags[0]] ?? 0;
  const threshold = Math.max(3, topScore - 2);

  return rankedTags.filter((tag, index) => index === 0 || scores[tag] >= threshold).slice(0, 3);
};

const buildPostureTag = (scores: Record<PlayerProfileTag, number>) => {
  const cautiousScore = scores.cautious;
  const riskyScore = scores.risky;

  if (cautiousScore < 3 && riskyScore < 3) {
    return undefined;
  }

  return riskyScore > cautiousScore ? 'risky' : 'cautious';
};

const buildRationaleByTag = (
  input: PlayerModelInput,
  tag: PlayerProfileTag,
): string => {
  switch (tag) {
    case 'exploration':
      return `近期访问了 ${new Set(input.recentAreaVisits).size} 个区域，说明玩家倾向通过探索推进进度。`;
    case 'combat':
      return `近期累计记录了 ${input.recentCombatActions.length} 次战斗操作，玩家会通过交锋来推动局势。`;
    case 'social':
      return `与角色的互动次数达到 ${input.npcInteractionCount} 次，且近期更偏向交流型意图。`;
    case 'story':
      return `近期做出了 ${input.recentQuestChoices.length} 次任务分支选择，说明玩家在主动追剧情。`;
    case 'speedrun':
      return '推进效率更高，常常优先完成目标并快速切换区域。';
    case 'cautious':
      return '在战斗与对话中更常选择观察、恢复或稳妥推进，整体节奏偏保守。';
    case 'risky':
      return '更常主动施压、快速出手或选择高风险分支，说明偏好激进打法。';
    default:
      return '系统已根据近期行为更新玩家画像。';
  }
};

const buildRiskForecast = (
  tags: PlayerProfileTag[],
  scores: Record<PlayerProfileTag, number>,
) => {
  if (tags.includes('risky') || tags.includes('combat')) {
    return '你近期倾向高压推进，若连续追求输出，下一场战斗更容易被反制或资源压制。';
  }

  if (tags.includes('speedrun')) {
    return '你推进节奏很快，若跳过关键线索或关系铺垫，后续可能会出现信息缺口。';
  }

  if (tags.includes('cautious')) {
    return '你当前更稳健，风险较低，但也可能因为节奏偏慢而错过高价值窗口。';
  }

  if (scores.story >= scores.exploration) {
    return '你更关注叙事推进，若忽略战备与资源补给，遭遇战的容错会下降。';
  }

  return '当前画像较为均衡，但系统会继续根据你的行为调整难度与提示。';
};

const buildStuckPoint = (
  tags: PlayerProfileTag[],
  scores: Record<PlayerProfileTag, number>,
) => {
  if (tags.includes('social') || tags.includes('story')) {
    return '如果任务暂时没有推进，优先去找关键角色对话，通常能触发新的信息或支线。';
  }

  if (tags.includes('exploration')) {
    return '如果暂时卡关，检查尚未搜索的互动点或未完全探索的区域，往往能补齐关键资源。';
  }

  if (tags.includes('combat')) {
    return '如果战斗压力过高，先调整战斗节奏，观察敌方战术切换后再决定是爆发还是防守。';
  }

  if (tags.includes('speedrun')) {
    return '如果追求速通时被卡住，先补一条关键支线或情报，再回来推进主线会更稳定。';
  }

  if (scores.cautious >= scores.risky) {
    return '你当前推进较稳，若局面停滞，可适当尝试更主动的探索或分支选择。';
  }

  return '建议在探索、交流与战斗之间轮换节奏，让系统更快识别出适合你的推进路径。';
};

export const createPlayerModelInputFromState = (options: {
  recentAreaVisits: string[];
  recentCombatActions: CombatCommandAction[];
  recentNpcInteractionIntents: NpcDialogueIntent[];
  recentQuestChoices: string[];
  combatSummary?: PlayerModelInput['combatSummary'];
  combatHistory: PlayerModelInput['combatHistory'];
  npcInteractionCount: number;
  activeQuestCount: number;
  completedQuestCount: number;
  signalWeights: PlayerModelSignalWeights;
}): PlayerModelInput => ({
  recentAreaVisits: options.recentAreaVisits,
  recentCombatActions: options.recentCombatActions,
  recentNpcInteractionIntents: options.recentNpcInteractionIntents,
  recentQuestChoices: options.recentQuestChoices,
  combatSummary: options.combatSummary ?? null,
  combatHistory: options.combatHistory,
  npcInteractionCount: options.npcInteractionCount,
  activeQuestCount: options.activeQuestCount,
  completedQuestCount: options.completedQuestCount,
  signalWeights: options.signalWeights,
});

export const applyPlayerAreaVisitSignal = (
  playerModel: PlayerModelState,
  areaId: string,
  options?: {
    appendRecentVisit?: boolean;
  },
): PlayerModelState => {
  const shouldAppend = options?.appendRecentVisit !== false;
  const hasVisited = playerModel.recentAreaVisits.includes(areaId);

  return {
    ...playerModel,
    recentAreaVisits: shouldAppend
      ? appendRecentHistory(playerModel.recentAreaVisits, areaId)
      : playerModel.recentAreaVisits,
    signalWeights: mergeSignalWeightDeltas(playerModel.signalWeights, {
      exploration: hasVisited ? 1 : 2,
      speedrun: hasVisited ? 0 : 1,
    }),
  };
};

export const applyPlayerExplorationSearchSignal = (
  playerModel: PlayerModelState,
  options?: {
    resourceFound?: boolean;
    triggeredAmbush?: boolean;
  },
): PlayerModelState => ({
  ...playerModel,
  signalWeights: mergeSignalWeightDeltas(playerModel.signalWeights, {
    exploration: options?.resourceFound ? 2 : 1,
    cautious: options?.resourceFound ? 1 : 0,
    risky: options?.triggeredAmbush ? 1 : 0,
  }),
});

export const applyPlayerCombatChoiceSignal = (
  playerModel: PlayerModelState,
  actionType: CombatCommandAction,
): PlayerModelState => {
  const riskyAction = actionType === 'attack' || actionType === 'special';
  const cautiousAction =
    actionType === 'guard' ||
    actionType === 'heal' ||
    actionType === 'analyze' ||
    actionType === 'retreat';

  return {
    ...playerModel,
    recentCombatActions: appendRecentHistory(playerModel.recentCombatActions, actionType),
    signalWeights: mergeSignalWeightDeltas(playerModel.signalWeights, {
      combat: 2,
      risky: riskyAction ? 2 : 0,
      cautious: cautiousAction ? 2 : 0,
      speedrun: actionType === 'special' ? 1 : 0,
    }),
  };
};

export const applyPlayerNpcInteractionSignal = (
  playerModel: PlayerModelState,
  observation: {
    intent: NpcDialogueIntent;
    trustDelta?: number;
    relationshipDelta?: number;
  },
): PlayerModelState => {
  const positiveInteraction =
    (observation.trustDelta ?? 0) > 0 || (observation.relationshipDelta ?? 0) > 0;
  const negativeInteraction =
    (observation.trustDelta ?? 0) < 0 || (observation.relationshipDelta ?? 0) < 0;

  return {
    ...playerModel,
    npcInteractionCount: playerModel.npcInteractionCount + 1,
    recentNpcInteractionIntents: appendRecentHistory(
      playerModel.recentNpcInteractionIntents,
      observation.intent,
    ),
    signalWeights: mergeSignalWeightDeltas(playerModel.signalWeights, {
      social:
        observation.intent === 'greet' ||
        observation.intent === 'trade' ||
        observation.intent === 'persuade'
          ? 2
          : 1,
      story:
        observation.intent === 'ask' || observation.intent === 'quest' ? 2 : 0,
      cautious:
        observation.intent === 'ask' || observation.intent === 'trade' ? 1 : 0,
      risky:
        observation.intent === 'persuade' && negativeInteraction
          ? 1
          : positiveInteraction && observation.intent === 'quest'
            ? 0
            : 0,
      speedrun:
        observation.intent === 'leave' && !positiveInteraction ? 1 : 0,
    }),
  };
};

export const applyPlayerQuestChoiceSignal = (
  playerModel: PlayerModelState,
  choiceId: string,
): PlayerModelState => ({
  ...playerModel,
  recentQuestChoices: appendRecentHistory(playerModel.recentQuestChoices, choiceId),
  signalWeights: mergeSignalWeightDeltas(playerModel.signalWeights, {
    story: 2,
    social: socialQuestChoicePattern.test(choiceId) ? 1 : 0,
    cautious: cautiousQuestChoicePattern.test(choiceId) ? 2 : 0,
    risky: riskyQuestChoicePattern.test(choiceId) ? 2 : 0,
    speedrun: /(rush|skip|fast|speedrun|direct)/i.test(choiceId) ? 2 : 0,
  }),
});

export const evaluatePlayerModel = (
  input: PlayerModelInput,
): PlayerModelRuleEvaluation => {
  const uniqueAreas = new Set(input.recentAreaVisits).size;
  const aggressiveCombatActions = countMatchingActions(input.recentCombatActions, [
    'attack',
    'special',
  ]);
  const carefulCombatActions = countMatchingActions(input.recentCombatActions, [
    'guard',
    'heal',
    'analyze',
    'retreat',
  ]);
  const socialIntents = countMatchingIntents(input.recentNpcInteractionIntents, [
    'greet',
    'trade',
    'persuade',
  ]);
  const storyIntents = countMatchingIntents(input.recentNpcInteractionIntents, [
    'ask',
    'quest',
    'persuade',
  ]);

  const scores: Record<PlayerProfileTag, number> = {
    exploration:
      input.signalWeights.exploration +
      uniqueAreas +
      Math.max(0, input.recentAreaVisits.length - 1),
    combat:
      input.signalWeights.combat +
      aggressiveCombatActions +
      input.combatHistory.length * 2 +
      (input.combatSummary ? 2 : 0),
    social:
      input.signalWeights.social +
      socialIntents * 2 +
      (input.npcInteractionCount >= 2 ? 2 : input.npcInteractionCount),
    story:
      input.signalWeights.story +
      input.recentQuestChoices.length * 2 +
      storyIntents +
      input.completedQuestCount,
    speedrun:
      input.signalWeights.speedrun +
      input.completedQuestCount * 2 +
      (uniqueAreas >= 3 && input.npcInteractionCount <= 2 ? 2 : 0) +
      (input.activeQuestCount > input.npcInteractionCount ? 1 : 0),
    cautious:
      input.signalWeights.cautious +
      carefulCombatActions * 2 +
      countMatchingIntents(input.recentNpcInteractionIntents, ['ask', 'trade']),
    risky:
      input.signalWeights.risky +
      aggressiveCombatActions * 2 +
      (input.combatSummary?.activeTactic === 'counter' ? 1 : 0),
  };

  const topDomainTags = buildTopDomainTags(scores);
  const postureTag = buildPostureTag(scores);
  const tags = normalizeTags(
    postureTag ? [...topDomainTags, postureTag] : topDomainTags,
    scores,
  );
  const dominantStyle = tags[0];

  return {
    tags,
    rationale: tags.slice(0, 3).map((tag) => buildRationaleByTag(input, tag)),
    riskForecast: buildRiskForecast(tags, scores),
    stuckPoint: buildStuckPoint(tags, scores),
    dominantStyle,
    tagScores: scores,
  };
};

export const mergePlayerModelOutputs = (options: {
  currentState: PlayerModelState;
  ruleOutput: PlayerModelRuleEvaluation;
  agentOutput: PlayerModelOutput;
  updatedAt: string;
}): PlayerModelState => {
  const mergedTags = normalizeTags(
    [...options.ruleOutput.tags, ...options.agentOutput.tags],
    options.ruleOutput.tagScores,
  );
  const mergedRationale = [...new Set([
    ...(options.ruleOutput.rationale ?? []),
    ...(options.agentOutput.rationale ?? []),
  ])].slice(0, 4);

  return {
    ...options.currentState,
    tags: mergedTags,
    rationale: mergedRationale,
    dominantStyle: mergedTags[0] ?? options.ruleOutput.dominantStyle,
    riskForecast:
      options.agentOutput.riskForecast ??
      options.ruleOutput.riskForecast ??
      options.currentState.riskForecast,
    stuckPoint:
      options.agentOutput.stuckPoint ??
      options.ruleOutput.stuckPoint ??
      options.currentState.stuckPoint,
    lastUpdatedAt: options.updatedAt,
  };
};

export const resolvePlayerDifficultyAdjustment = (
  playerModel: Pick<PlayerModelState, 'tags'>,
  difficulty: DifficultyLevel,
): PlayerDifficultyAdjustment => {
  const tuningPreset = getCombatTuningPreset(difficulty);
  let profileBias = 0;

  if (
    playerModel.tags.includes('combat') ||
    playerModel.tags.includes('risky') ||
    playerModel.tags.includes('speedrun')
  ) {
    profileBias += tuningPreset.playerModelBiasStep;
  }

  if (
    playerModel.tags.includes('story') ||
    playerModel.tags.includes('social') ||
    playerModel.tags.includes('cautious')
  ) {
    profileBias -= tuningPreset.playerModelBiasStep;
  }

  const enemyHpMultiplier = clampEnemyHpMultiplier(
    tuningPreset.baseEnemyHpMultiplier + profileBias,
    tuningPreset.minimumResolvedEnemyHpMultiplier,
    tuningPreset.maximumResolvedEnemyHpMultiplier,
  );

  if (enemyHpMultiplier <= 0.92) {
    return {
      enemyHpMultiplier,
      label: '引导强度',
      summary: `当前画像更偏探索、剧情或稳妥推进，本场敌人生命系数调整为 ${Math.round(
        enemyHpMultiplier * 100,
      )}% ，让你更容易观察战术变化。`,
      tier: 'assist',
    };
  }

  if (enemyHpMultiplier >= 1.08) {
    return {
      enemyHpMultiplier,
      label: '对抗强度',
      summary: `当前画像更偏战斗、冒险或速推进，本场敌人生命系数调整为 ${Math.round(
        enemyHpMultiplier * 100,
      )}% ，系统会更主动给出反制压力。`,
      tier: 'pressure',
    };
  }

  return {
    enemyHpMultiplier,
    label: '均衡强度',
    summary: '当前画像较为均衡，本场维持常规对抗强度，方便观察系统基础节奏。',
    tier: 'steady',
  };
};

export const buildPlayerGuidanceHints = (
  playerModel: Pick<
    PlayerModelState,
    'dominantStyle' | 'rationale' | 'riskForecast' | 'stuckPoint' | 'tags'
  >,
): PlayerGuidanceHint[] => {
  const hints: PlayerGuidanceHint[] = [];

  if (playerModel.tags.includes('exploration')) {
    hints.push({
      id: 'guidance:exploration',
      title: '探索建议',
      summary: '你适合继续搜索未清理的互动点，区域切换前先把可见线索和资源拿齐。',
      tone: 'info',
    });
  }

  if (playerModel.tags.includes('social') || playerModel.tags.includes('story')) {
    hints.push({
      id: 'guidance:npc',
      title: '交流建议',
      summary: '你当前更擅长通过对话推进内容，优先去找关键角色获取任务线索会更有效。',
      tone: 'success',
    });
  }

  if (playerModel.tags.includes('combat') || playerModel.tags.includes('risky')) {
    hints.push({
      id: 'guidance:combat',
      title: '战斗提醒',
      summary:
        playerModel.riskForecast ??
        '你更偏主动进攻，建议在敌方切换战术时留一点资源做应对。',
      tone: 'warning',
    });
  }

  if (playerModel.tags.includes('speedrun')) {
    hints.push({
      id: 'guidance:speedrun',
      title: '速推提醒',
      summary:
        playerModel.stuckPoint ??
        '你推进很快，但别跳过关键情报点，否则后续可能要回头补线索。',
      tone: 'warning',
    });
  }

  if (hints.length === 0) {
    hints.push({
      id: 'guidance:baseline',
      title: '当前建议',
      summary:
        playerModel.rationale[0] ?? '系统正在持续观察你的选择，接下来可在探索、交流与战斗间继续建立画像。',
      tone: 'default',
    });
  }

  return hints.slice(0, 3);
};

export const resolveNpcReactionBias = (
  playerModel: Pick<PlayerModelState, 'tags'>,
  intent: NpcDialogueIntent,
): PlayerNpcReactionBias => {
  let trustDelta = 0;
  let relationshipDelta = 0;
  const reasons: string[] = [];

  if (
    playerModel.tags.includes('social') &&
    (intent === 'greet' || intent === 'trade' || intent === 'persuade')
  ) {
    trustDelta += 1;
    relationshipDelta += 2;
    reasons.push('角色认为你更擅长沟通，因此更愿意给出积极回应。');
  }

  if (playerModel.tags.includes('story') && (intent === 'ask' || intent === 'quest')) {
    trustDelta += 1;
    reasons.push('角色察觉你在认真追线索，因此更愿意透露信息。');
  }

  if (playerModel.tags.includes('cautious') && (intent === 'ask' || intent === 'trade')) {
    trustDelta += 1;
    reasons.push('你近期表现稳妥，角色对你的防备更低。');
  }

  if (
    (playerModel.tags.includes('risky') || playerModel.tags.includes('speedrun')) &&
    (intent === 'quest' || intent === 'persuade')
  ) {
    trustDelta -= 1;
    relationshipDelta -= 1;
    reasons.push('你近期推进较快或较冒险，角色会担心你只是想立刻达成目标。');
  }

  return {
    trustDelta,
    relationshipDelta,
    reasons,
  };
};

export const resolveEnemyCounterStrategyBias = (
  playerTags: PlayerProfileTag[],
): PlayerEnemyCounterStrategyBias => {
  const tacticPriorities: EnemyTacticType[] = [];
  const reasons: string[] = [];

  if (
    playerTags.includes('combat') ||
    playerTags.includes('risky') ||
    playerTags.includes('speedrun')
  ) {
    tacticPriorities.push('counter', 'resource-lock', 'aggressive');
    reasons.push('系统判断玩家偏主动压制，因此优先启用反制、锁资源与高压战术。');
  }

  if (playerTags.includes('cautious') || playerTags.includes('story')) {
    tacticPriorities.push('trap', 'defensive');
    reasons.push('系统判断玩家偏稳妥推进，因此更容易触发陷阱与防守拖节奏。');
  }

  if (playerTags.includes('social')) {
    tacticPriorities.push('summon', 'defensive');
    reasons.push('系统判断玩家更依赖交流与节奏控制，因此更可能用召唤与控场来分散注意。');
  }

  return {
    tacticPriorities: [...new Set(tacticPriorities)],
    reasons,
  };
};

export const createPlayerModelPreviewState = (options: {
  tags: PlayerProfileTag[];
  rationale?: string[];
  dominantStyle?: PlayerProfileTag;
  riskForecast?: string;
  stuckPoint?: string;
}): Pick<
  PlayerModelState,
  'tags' | 'dominantStyle' | 'rationale' | 'riskForecast' | 'stuckPoint'
> => ({
  tags: options.tags,
  dominantStyle: options.dominantStyle ?? options.tags[0],
  rationale:
    options.rationale && options.rationale.length > 0
      ? options.rationale
      : ['当前为调试画像预览，可直接对比系统反馈差异。'],
  riskForecast: options.riskForecast,
  stuckPoint: options.stuckPoint,
});

export const buildPlayerSystemReactionPreview = (options: {
  playerModel: Pick<
    PlayerModelState,
    'tags' | 'dominantStyle' | 'rationale' | 'riskForecast' | 'stuckPoint'
  >;
  difficulty: DifficultyLevel;
  npcIntent: NpcDialogueIntent;
}): PlayerSystemReactionPreview => ({
  difficulty: resolvePlayerDifficultyAdjustment(
    options.playerModel,
    options.difficulty,
  ),
  hints: buildPlayerGuidanceHints(options.playerModel),
  npcReaction: resolveNpcReactionBias(options.playerModel, options.npcIntent),
  enemyStrategy: resolveEnemyCounterStrategyBias(options.playerModel.tags),
});

export const createDefaultPlayerModelState = (
  tags: PlayerProfileTag[],
  currentAreaId: string,
): PlayerModelState => ({
  tags,
  rationale: [],
  recentAreaVisits: [currentAreaId],
  recentCombatActions: [],
  recentNpcInteractionIntents: [],
  recentQuestChoices: [],
  npcInteractionCount: 0,
  signalWeights: createEmptyPlayerModelSignalWeights(),
  dominantStyle: tags[0],
});
