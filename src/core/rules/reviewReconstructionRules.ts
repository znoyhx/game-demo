import type {
  CombatEncounterDefinition,
  CombatHistoryEntry,
  EventLogEntry,
  ExplainCoachInput,
  NpcDefinition,
  NpcDialogueIntent,
  NpcState,
  PlayerModelState,
  PlayerState,
  QuestDefinition,
  QuestProgress,
  ReviewPayload,
  ReviewReconstructionTarget,
  ReviewRequest,
  ReviewTriggerType,
  SaveSnapshot,
} from '../schemas';
import {
  createEmptyPlayerModelSignalWeights,
  explainCoachInputSchema,
  reviewReconstructionTargetSchema,
  reviewRequestSchema,
  saveSnapshotSchema,
} from '../schemas';
import { formatNpcDialogueIntentLabel } from '../utils/displayLabels';

import { buildNpcInteractionExplanation } from './npcRules';

const uniqueStrings = (entries: Array<string | undefined | null>) =>
  Array.from(
    new Set(
      entries
        .map((entry) => entry?.trim())
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const takeUpToIndex = <T>(entries: T[], index?: number) => {
  if (entries.length === 0) {
    return [] as T[];
  }

  if (index === undefined) {
    return [...entries];
  }

  const normalizedIndex = clamp(Math.floor(index), 0, entries.length - 1);
  return entries.slice(0, normalizedIndex + 1);
};

const getLastEntry = <T>(entries: T[]) =>
  entries.length > 0 ? entries[entries.length - 1] : null;

const buildDefaultPlayerModelState = (player: PlayerState): PlayerModelState => ({
  tags: player.profileTags,
  rationale: [],
  recentAreaVisits: [player.currentAreaId],
  recentCombatActions: [],
  recentNpcInteractionIntents: [],
  recentQuestChoices: [],
  npcInteractionCount: 0,
  signalWeights: createEmptyPlayerModelSignalWeights(),
  dominantStyle: player.profileTags[0],
});

const getPersistedReviewHistory = (snapshot: SaveSnapshot) =>
  snapshot.reviewState?.history ?? (snapshot.review ? [snapshot.review] : []);

const getPersistedCurrentReview = (snapshot: SaveSnapshot) =>
  snapshot.reviewState?.current ?? snapshot.review ?? null;

const toQuestDefinitionMap = (definitions: QuestDefinition[]) =>
  definitions.reduce<Record<string, QuestDefinition>>((accumulator, definition) => {
    accumulator[definition.id] = definition;
    return accumulator;
  }, {});

const toNpcDefinitionMap = (definitions: NpcDefinition[]) =>
  definitions.reduce<Record<string, NpcDefinition>>((accumulator, definition) => {
    accumulator[definition.id] = definition;
    return accumulator;
  }, {});

const toQuestProgressMap = (progressEntries: QuestProgress[]) =>
  progressEntries.reduce<Record<string, QuestProgress>>((accumulator, progress) => {
    accumulator[progress.questId] = progress;
    return accumulator;
  }, {});

const getMainQuestDefinition = (definitions: QuestDefinition[]) =>
  definitions.find((definition) => definition.type === 'main') ?? definitions[0] ?? null;

const formatQuestStatusLabel = (status: QuestProgress['status']) => {
  switch (status) {
    case 'locked':
      return '未解锁';
    case 'available':
      return '可接取';
    case 'active':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '已失败';
    default:
      return '状态未知';
  }
};

const selectCombatHistory = (
  snapshot: SaveSnapshot,
  target: ReviewReconstructionTarget,
) => {
  const history = snapshot.combatSystem?.history ?? [];

  if (history.length === 0) {
    return {
      entry: null as CombatHistoryEntry | null,
      encounter: null as CombatEncounterDefinition | null,
      historySlice: [] as CombatHistoryEntry[],
      cutoffTimestamp: snapshot.metadata.updatedAt,
    };
  }

  if (target.combatHistoryIndex !== undefined) {
    const historySlice = takeUpToIndex(history, target.combatHistoryIndex);
    const entry = historySlice[historySlice.length - 1] ?? null;

    return {
      entry,
      encounter:
        snapshot.combatSystem?.encounters.find(
          (encounter) => encounter.id === entry?.encounterId,
        ) ?? null,
      historySlice,
      cutoffTimestamp: entry?.resolvedAt ?? snapshot.metadata.updatedAt,
    };
  }

  const selectedIndex =
    target.encounterId !== undefined
      ? history
          .map((entry, index) => ({ entry, index }))
          .filter((entry) => entry.entry.encounterId === target.encounterId)
          .slice(-1)[0]?.index
      : history.length - 1;

  const historySlice = takeUpToIndex(history, selectedIndex);
  const entry = historySlice[historySlice.length - 1] ?? null;

  return {
    entry,
    encounter:
      snapshot.combatSystem?.encounters.find(
        (encounter) => encounter.id === entry?.encounterId,
      ) ?? null,
    historySlice,
    cutoffTimestamp: entry?.resolvedAt ?? snapshot.metadata.updatedAt,
  };
};

const selectQuestContext = (
  snapshot: SaveSnapshot,
  target: ReviewReconstructionTarget,
) => {
  const questDefinitionsById = toQuestDefinitionMap(snapshot.quests.definitions);
  const questProgressById = toQuestProgressMap(snapshot.quests.progress);
  const persistedCurrentReview = getPersistedCurrentReview(snapshot);
  const persistedQuestId =
    persistedCurrentReview?.questBranchReasons[0]?.questId ??
    (persistedCurrentReview?.outcomeFactors.some((factor) => factor.kind === 'failure')
      ? getMainQuestDefinition(snapshot.quests.definitions)?.id
      : undefined);

  const historySelection =
    target.questHistoryIndex !== undefined
      ? getLastEntry(takeUpToIndex(snapshot.quests.history, target.questHistoryIndex))
      : null;
  const questId =
    target.questId ??
    historySelection?.questId ??
    persistedQuestId ??
    snapshot.quests.progress.find((entry) => Boolean(entry.chosenBranchId))?.questId ??
    getLastEntry(snapshot.quests.history)?.questId ??
    getMainQuestDefinition(snapshot.quests.definitions)?.id ??
    null;
  const definition = questId ? questDefinitionsById[questId] ?? null : null;
  const progress = questId ? questProgressById[questId] ?? null : null;
  const historyEntry =
    historySelection ??
    (questId
      ? [...snapshot.quests.history].reverse().find((entry) => entry.questId === questId) ??
        null
      : null);
  const branchId = progress?.chosenBranchId ?? historyEntry?.branchId;
  const branch =
    definition?.branchResults.find((branchResult) => branchResult.id === branchId) ?? null;
  const cutoffTimestamp =
    historyEntry?.updatedAt ?? progress?.updatedAt ?? snapshot.metadata.updatedAt;

  return {
    definition,
    progress,
    historyEntry,
    branch,
    cutoffTimestamp,
  };
};

const getLatestReviewQuestReason = (
  reviewHistory: ReviewPayload[],
  questId: string | undefined,
) =>
  questId
    ? [...reviewHistory]
        .reverse()
        .flatMap((review) => review.questBranchReasons)
        .find((reason) => reason.questId === questId) ?? null
    : null;

const buildQuestBranchRequest = (options: {
  snapshot: SaveSnapshot;
  target: ReviewReconstructionTarget;
  reviewHistory: ReviewPayload[];
}) => {
  const context = selectQuestContext(options.snapshot, options.target);
  const fallbackQuest = getMainQuestDefinition(options.snapshot.quests.definitions);
  const definition = context.definition ?? fallbackQuest;
  const progress =
    context.progress ??
    (definition
      ? options.snapshot.quests.progress.find((entry) => entry.questId === definition.id) ?? null
      : null);
  const historyEntry = context.historyEntry;
  const breadcrumb = getLatestReviewQuestReason(
    options.reviewHistory,
    definition?.id ?? progress?.questId,
  );

  const status = historyEntry?.status ?? progress?.status ?? 'active';
  const branch = context.branch;
  const summary =
    breadcrumb?.summary ??
    historyEntry?.note ??
    (branch
      ? `任务“${definition?.title ?? progress?.questId ?? '未知任务'}”进入了“${branch.label}”分支。`
      : `任务“${definition?.title ?? progress?.questId ?? '未知任务'}”当前状态为${formatQuestStatusLabel(
          status,
        )}。`);

  const reasons = uniqueStrings([
    ...(breadcrumb?.reasons ?? []),
    historyEntry?.note,
    branch?.description,
    historyEntry?.conditionId ? `关键条件 ${historyEntry.conditionId} 已触发。` : undefined,
    progress?.chosenBranchId ? `已记录分支 ${progress.chosenBranchId}。` : undefined,
  ]);

  return reviewRequestSchema.parse({
    trigger: 'quest-branch',
    questBranch: {
      questId: definition?.id ?? progress?.questId ?? 'quest:unknown',
      questTitle: definition?.title ?? breadcrumb?.questTitle ?? '未知任务',
      branchId: branch?.id ?? historyEntry?.branchId ?? breadcrumb?.branchId,
      branchLabel: branch?.label ?? breadcrumb?.branchLabel,
      status,
      summary,
      reasons,
    },
  });
};

const getLatestReviewNpcReason = (
  reviewHistory: ReviewPayload[],
  npcId: string | undefined,
) =>
  npcId
    ? [...reviewHistory]
        .reverse()
        .flatMap((review) => review.npcAttitudeReasons)
        .find((reason) => reason.npcId === npcId) ?? null
    : null;

const inferNpcIntent = (state: NpcState): NpcDialogueIntent => {
  if (state.hasGivenQuestIds.length > 0) {
    return 'quest';
  }

  if (state.revealedFacts.length > 0 || state.revealedSecrets.length > 0) {
    return 'ask';
  }

  return 'greet';
};

const buildNpcInteractionRequest = (options: {
  snapshot: SaveSnapshot;
  target: ReviewReconstructionTarget;
  reviewHistory: ReviewPayload[];
}) => {
  const npcDefinitionsById = toNpcDefinitionMap(options.snapshot.npcs.definitions);
  const persistedCurrentReview = getPersistedCurrentReview(options.snapshot);
  const targetNpcId =
    options.target.npcId ??
    persistedCurrentReview?.npcAttitudeReasons[0]?.npcId ??
    [...options.reviewHistory]
      .reverse()
      .flatMap((review) => review.npcAttitudeReasons)
      .find(Boolean)?.npcId ??
    [...options.snapshot.npcs.runtime]
      .filter((entry) => Boolean(entry.memory.lastInteractionAt))
      .sort((left, right) =>
        (left.memory.lastInteractionAt ?? '').localeCompare(
          right.memory.lastInteractionAt ?? '',
        ),
      )
      .slice(-1)[0]?.npcId ??
    options.snapshot.npcs.runtime[0]?.npcId;

  const afterState =
    options.snapshot.npcs.runtime.find((entry) => entry.npcId === targetNpcId) ?? null;
  const definition = targetNpcId ? npcDefinitionsById[targetNpcId] ?? null : null;
  const breadcrumb = getLatestReviewNpcReason(options.reviewHistory, targetNpcId);

  if (!afterState || !targetNpcId) {
    return reviewRequestSchema.parse({
      trigger: 'npc-interaction',
    });
  }

  const beforeState: NpcState = breadcrumb
    ? {
        ...afterState,
        trust: clamp(afterState.trust - breadcrumb.trustDelta, 0, 100),
        relationship: clamp(
          afterState.relationship - breadcrumb.relationshipDelta,
          -100,
          100,
        ),
      }
    : afterState;
  const intent = inferNpcIntent(afterState);
  const explanation = buildNpcInteractionExplanation({
    npcId: targetNpcId,
    npcName: definition?.name ?? breadcrumb?.npcName ?? targetNpcId,
    beforeState,
    afterState,
    intent,
    questOfferIds: afterState.hasGivenQuestIds,
    disclosedFacts: afterState.revealedFacts.slice(-2),
    disclosedSecrets: afterState.revealedSecrets.slice(-1),
    relationshipNetworkChanges: [],
    itemTransfers: [],
    playerGoldDelta: 0,
    decisionBasis: uniqueStrings([
      ...(breadcrumb?.decisionBasis ?? []),
      ...afterState.memory.shortTerm.slice(-2),
      ...afterState.memory.longTerm.slice(-1),
      afterState.currentGoal,
      `${formatNpcDialogueIntentLabel(intent)}是本次重建使用的主要互动意图。`,
    ]),
    explanationHint: breadcrumb?.summary,
  });

  return reviewRequestSchema.parse({
    trigger: 'npc-interaction',
    npcInteraction: {
      npcId: targetNpcId,
      npcName: definition?.name ?? breadcrumb?.npcName ?? targetNpcId,
      explanation,
      unlockedQuestIds: afterState.hasGivenQuestIds,
      isMajor: true,
    },
  });
};

const buildRunOutcomeRequest = (options: {
  snapshot: SaveSnapshot;
  target: ReviewReconstructionTarget;
}) => {
  const mainQuest = getMainQuestDefinition(options.snapshot.quests.definitions);
  const progress = mainQuest
    ? options.snapshot.quests.progress.find((entry) => entry.questId === mainQuest.id) ?? null
    : null;
  const historyEntry =
    mainQuest
      ? [...options.snapshot.quests.history]
          .reverse()
          .find((entry) => entry.questId === mainQuest.id) ?? null
      : null;
  const result =
    options.target.trigger === 'run-complete'
      ? 'completed'
      : options.target.trigger === 'run-failed'
        ? 'failed'
        : progress?.status === 'completed'
          ? 'completed'
          : 'failed';
  const recentEvents = options.snapshot.events.history.slice(-2);

  return reviewRequestSchema.parse({
    trigger: result === 'completed' ? 'run-complete' : 'run-failed',
    runOutcome: {
      result,
      questId: mainQuest?.id,
      questTitle: mainQuest?.title,
      summary:
        historyEntry?.note ??
        (mainQuest
          ? `主线任务“${mainQuest.title}”已${result === 'completed' ? '完成' : '失败'}。`
          : `本轮冒险已${result === 'completed' ? '完成' : '失败'}。`),
      reasons: uniqueStrings([
        historyEntry?.note,
        progress
          ? `主线当前状态为${formatQuestStatusLabel(progress.status)}。`
          : undefined,
        ...recentEvents.map((entry) => `事件 ${entry.eventId} 于 ${entry.triggeredAt} 触发。`),
      ]),
    },
  });
};

export const inferReviewTriggerFromSnapshot = (options: {
  snapshot: SaveSnapshot;
  target?: ReviewReconstructionTarget;
}): ReviewTriggerType => {
  const snapshot = saveSnapshotSchema.parse(options.snapshot);
  const target = reviewReconstructionTargetSchema.parse(options.target ?? {});
  const persistedCurrentReview = getPersistedCurrentReview(snapshot);
  const mainQuest = getMainQuestDefinition(snapshot.quests.definitions);
  const mainProgress = mainQuest
    ? snapshot.quests.progress.find((entry) => entry.questId === mainQuest.id) ?? null
    : null;

  if (target.trigger) {
    return target.trigger;
  }

  if (persistedCurrentReview?.trigger && persistedCurrentReview.trigger !== 'manual') {
    return persistedCurrentReview.trigger;
  }

  if (mainProgress?.status === 'failed') {
    return 'run-failed';
  }

  if (mainProgress?.status === 'completed') {
    return 'run-complete';
  }

  if (target.encounterId || target.combatHistoryIndex !== undefined) {
    return 'combat';
  }

  if (target.questId || target.questHistoryIndex !== undefined) {
    return 'quest-branch';
  }

  if (target.npcId) {
    return 'npc-interaction';
  }

  if (snapshot.combatSystem?.history.length) {
    return 'combat';
  }

  if (snapshot.quests.history.length) {
    return 'quest-branch';
  }

  if (snapshot.npcs.runtime.some((entry) => Boolean(entry.memory.lastInteractionAt))) {
    return 'npc-interaction';
  }

  return 'manual';
};

const buildManualRequest = () =>
  reviewRequestSchema.parse({
    trigger: 'manual',
  });

const filterReviewsByTimestamp = (
  reviewHistory: ReviewPayload[],
  cutoffTimestamp: string,
) =>
  reviewHistory.filter((review) => review.generatedAt <= cutoffTimestamp);

const filterEventsByTimestamp = (
  eventHistory: EventLogEntry[],
  cutoffTimestamp: string,
) => eventHistory.filter((entry) => entry.triggeredAt <= cutoffTimestamp);

export const buildExplainCoachInputFromSnapshot = (options: {
  snapshot: SaveSnapshot;
  target?: ReviewReconstructionTarget;
}): ExplainCoachInput => {
  const snapshot = saveSnapshotSchema.parse(options.snapshot);
  const target = reviewReconstructionTargetSchema.parse(options.target ?? {});
  const trigger = inferReviewTriggerFromSnapshot({ snapshot, target });
  const persistedReviewHistory = getPersistedReviewHistory(snapshot);
  const combatSelection = selectCombatHistory(snapshot, target);
  const questSelection = selectQuestContext(snapshot, target);
  const cutoffTimestamp =
    trigger === 'combat'
      ? combatSelection.cutoffTimestamp
      : trigger === 'quest-branch'
        ? questSelection.cutoffTimestamp
        : trigger === 'npc-interaction'
          ? snapshot.npcs.runtime.find((entry) => entry.npcId === target.npcId)?.memory
              .lastInteractionAt ?? snapshot.metadata.updatedAt
          : trigger === 'run-complete' || trigger === 'run-failed'
            ? questSelection.cutoffTimestamp
            : target.eventHistoryIndex !== undefined
              ? getLastEntry(takeUpToIndex(snapshot.events.history, target.eventHistoryIndex))
                  ?.triggeredAt ?? snapshot.metadata.updatedAt
              : snapshot.metadata.updatedAt;
  const reviewHistory = filterReviewsByTimestamp(
    persistedReviewHistory,
    cutoffTimestamp,
  );
  const eventHistory =
    target.eventHistoryIndex !== undefined
      ? takeUpToIndex(snapshot.events.history, target.eventHistoryIndex)
      : target.eventId
        ? takeUpToIndex(
            snapshot.events.history,
            snapshot.events.history
              .map((entry, index) => ({ entry, index }))
              .filter((entry) => entry.entry.eventId === target.eventId)
              .slice(-1)[0]?.index,
          )
        : filterEventsByTimestamp(snapshot.events.history, cutoffTimestamp);
  const reviewRequest: ReviewRequest =
    trigger === 'combat'
      ? reviewRequestSchema.parse({
          trigger: 'combat',
        })
      : trigger === 'quest-branch'
        ? buildQuestBranchRequest({
            snapshot,
            target,
            reviewHistory,
          })
        : trigger === 'npc-interaction'
          ? buildNpcInteractionRequest({
              snapshot,
              target,
              reviewHistory,
            })
          : trigger === 'run-complete' || trigger === 'run-failed'
            ? buildRunOutcomeRequest({
                snapshot,
                target: {
                  ...target,
                  trigger,
                },
              })
            : buildManualRequest();

  return explainCoachInputSchema.parse({
    player: snapshot.player,
    playerModel: snapshot.playerModel ?? buildDefaultPlayerModelState(snapshot.player),
    difficulty: snapshot.config?.difficulty ?? 'normal',
    reviewRequest,
    reviewHistory,
    encounter:
      trigger === 'combat'
        ? combatSelection.encounter
        : null,
    combat:
      trigger === 'combat'
        ? snapshot.combatSystem?.active ?? snapshot.combat ?? null
        : null,
    combatHistory:
      trigger === 'combat'
        ? combatSelection.historySlice
        : snapshot.combatSystem?.history ?? [],
    questProgress: snapshot.quests.progress,
    eventHistory,
  });
};
