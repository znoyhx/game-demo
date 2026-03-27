import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import {
  appAreaDebugController,
  appConfigResourceDebugController,
  appDebugScenarioController,
  appEventDebugController,
  appPlayerModelController,
  appQuestDebugController,
  appWorldCreationController,
} from '../../app/runtime/appRuntime';
import { CombatDebugPanel } from '../../components/debug/CombatDebugPanel';
import { ConfigResourceDebugPanel } from '../../components/debug/ConfigResourceDebugPanel';
import { EventDebugPanel } from '../../components/debug/EventDebugPanel';
import { PlayerModelDebugPanel } from '../../components/debug/PlayerModelDebugPanel';
import { RenderingPreviewGallery } from '../../components/debug/RenderingPreviewGallery';
import { DebugPanel } from '../../components/debug/DebugPanel';
import { NpcDebugPanel } from '../../components/debug/NpcDebugPanel';
import { QuestDebugPanel } from '../../components/debug/QuestDebugPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { PixelTabs } from '../../components/pixel-ui/PixelTabs';
import { resolveDebugFeatureFlags } from '../../core/config';
import { useGameLogStore } from '../../core/logging';
import {
  playerModelBehaviorReplayPresets,
  playerModelPresetScenarios,
} from '../../core/mocks/mvp';
import { debugPanels } from '../../core/mocks/shellContent';
import {
  resolveAreaEnvironmentState,
  summarizeCombatPhaseChanges,
  summarizeCombatPlayerBehaviors,
  summarizeCombatTacticChanges,
} from '../../core/rules';
import type {
  CombatDebugPlayerPattern,
  EnemyTacticType,
  EventDebugOutcome,
  GameDifficulty,
  NpcDialogueIntent,
  NpcDisposition,
  NpcEmotionalState,
  NpcState,
  PlayerProfileTag,
} from '../../core/schemas';
import {
  selectAreas,
  selectCombatEncounters,
  selectCombatState,
  selectCurrentArea,
  selectCurrentReview,
  selectDebugToolsState,
  selectEventDefinitions,
  selectEventDirector,
  selectEventHistory,
  selectExplorationState,
  selectGameConfig,
  selectMapState,
  selectNpcDefinitions,
  selectNpcStates,
  selectPlayerModelState,
  selectPlayerState,
  selectQuestDefinitions,
  selectQuestProgressEntries,
  selectResourceState,
  selectSaveMetadata,
  selectSaveStatus,
  selectWorldFlags,
  selectWorldRuntime,
  selectWorldSummary,
  useGameStore,
} from '../../core/state';
import {
  formatCombatResultLabel,
  formatEnemyTacticLabel,
  formatPlayerTagLabel,
  npcDispositionLabels,
  npcDialogueIntentLabels,
  npcEmotionalStateLabels,
} from '../../core/utils/displayLabels';
import { locale } from '../../core/utils/locale';
import { buildConfigResourceDebugViewModel } from './configResourceDebugViewModel';
import { buildRenderingPreviewViewModel } from './renderingPreviewViewModel';

const debugText = locale.pages.debug;

const combatModeLabels = {
  'turn-based': '回合制',
  'semi-realtime': '半即时指令',
} as const;

const combatPatternLabels: Record<CombatDebugPlayerPattern, string> = {
  'direct-pressure': '正面压迫',
  'guard-cycle': '防守循环',
  'resource-burst': '资源爆发',
  'analysis-first': '先解析后压制',
};

export function DebugPage() {
  const navigate = useNavigate();
  const logEntries = useGameLogStore((state) => state.entries);
  const worldSummary = useGameStore(selectWorldSummary);
  const worldRuntime = useGameStore(selectWorldRuntime);
  const worldFlags = useGameStore(selectWorldFlags);
  const currentArea = useGameStore(selectCurrentArea);
  const areas = useGameStore(useShallow(selectAreas));
  const mapState = useGameStore(selectMapState);
  const questDefinitions = useGameStore(useShallow(selectQuestDefinitions));
  const questProgressEntries = useGameStore(useShallow(selectQuestProgressEntries));
  const npcDefinitions = useGameStore(useShallow(selectNpcDefinitions));
  const npcStates = useGameStore(useShallow(selectNpcStates));
  const player = useGameStore(selectPlayerState);
  const playerModel = useGameStore(selectPlayerModelState);
  const explorationState = useGameStore(selectExplorationState);
  const combatEncounters = useGameStore(useShallow(selectCombatEncounters));
  const combatState = useGameStore(selectCombatState);
  const eventDefinitions = useGameStore(useShallow(selectEventDefinitions));
  const eventHistory = useGameStore(selectEventHistory);
  const eventDirector = useGameStore(selectEventDirector);
  const review = useGameStore(selectCurrentReview);
  const gameConfig = useGameStore(selectGameConfig);
  const resourceState = useGameStore(selectResourceState);
  const saveMetadata = useGameStore(selectSaveMetadata);
  const saveStatus = useGameStore(selectSaveStatus);
  const debugTools = useGameStore(selectDebugToolsState);
  const patchDebugToolsState = useGameStore((state) => state.patchDebugToolsState);
  const debugFeatureFlags = useMemo(
    () => resolveDebugFeatureFlags(gameConfig),
    [gameConfig],
  );

  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewAreaId, setPreviewAreaId] = useState<string | null>(null);
  const [previewControlId, setPreviewControlId] = useState<string | null>(null);
  const [previewStatusMessage, setPreviewStatusMessage] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedEnvironmentStateId, setSelectedEnvironmentStateId] = useState<string | null>(null);
  const [areaDebugStatusMessage, setAreaDebugStatusMessage] = useState<string | null>(null);
  const [busyAreaDebugActionId, setBusyAreaDebugActionId] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [selectedQuestStageIndex, setSelectedQuestStageIndex] = useState(0);
  const [selectedQuestBranchId, setSelectedQuestBranchId] = useState('');
  const [questDebugStatusMessage, setQuestDebugStatusMessage] = useState<string | null>(null);
  const [busyQuestDebugActionId, setBusyQuestDebugActionId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventHistoryIndex, setSelectedEventHistoryIndex] = useState<number | null>(
    null,
  );
  const [eventDebugStatusMessage, setEventDebugStatusMessage] = useState<string | null>(
    null,
  );
  const [busyEventDebugActionId, setBusyEventDebugActionId] = useState<string | null>(
    null,
  );
  const [latestEventOutcome, setLatestEventOutcome] = useState<EventDebugOutcome | null>(
    null,
  );
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [npcTrustValue, setNpcTrustValue] = useState('0');
  const [npcRelationshipValue, setNpcRelationshipValue] = useState('0');
  const [npcDispositionValue, setNpcDispositionValue] =
    useState<NpcDisposition>('neutral');
  const [npcEmotionalStateValue, setNpcEmotionalStateValue] =
    useState<NpcEmotionalState>('calm');
  const [npcShortTermMemoryValue, setNpcShortTermMemoryValue] = useState('');
  const [npcLongTermMemoryValue, setNpcLongTermMemoryValue] = useState('');
  const [npcCurrentGoalValue, setNpcCurrentGoalValue] = useState('');
  const [npcDebugStatusMessage, setNpcDebugStatusMessage] = useState<string | null>(null);
  const [busyNpcDebugActionId, setBusyNpcDebugActionId] = useState<string | null>(null);
  const [latestNpcOutcome, setLatestNpcOutcome] = useState<{
    npcName: string;
    optionLabel: string;
    attitudeLabel: string;
    emotionalStateLabel: string;
    trustDelta: number;
    relationshipDelta: number;
    trustReasons: string[];
    relationshipReasons: string[];
    decisionBasis: string[];
    debugSummary: string;
  } | null>(null);
  const [selectedCombatEncounterId, setSelectedCombatEncounterId] = useState<string | null>(
    null,
  );
  const [selectedForcedTactic, setSelectedForcedTactic] =
    useState<EnemyTacticType | ''>('');
  const [selectedForcedPhaseId, setSelectedForcedPhaseId] = useState('');
  const [selectedCombatPattern, setSelectedCombatPattern] =
    useState<CombatDebugPlayerPattern>(
      debugTools.simulatedPlayerPattern ?? 'analysis-first',
    );
  const [combatSeedValue, setCombatSeedValue] = useState(
    String(debugTools.combatSeed ?? 7),
  );
  const [combatSimulateRoundsValue, setCombatSimulateRoundsValue] = useState('3');
  const [combatDebugStatusMessage, setCombatDebugStatusMessage] =
    useState<string | null>(null);
  const [busyCombatDebugActionId, setBusyCombatDebugActionId] = useState<
    string | null
  >(null);
  const [selectedManualPlayerTags, setSelectedManualPlayerTags] = useState<
    PlayerProfileTag[]
  >(playerModel.tags);
  const [selectedComparisonTags, setSelectedComparisonTags] = useState<
    PlayerProfileTag[]
  >(playerModel.tags);
  const [selectedPlayerReplayId, setSelectedPlayerReplayId] = useState(
    playerModelBehaviorReplayPresets[0]?.id ?? '',
  );
  const [selectedPlayerScenarioId, setSelectedPlayerScenarioId] = useState(
    playerModelPresetScenarios[0]?.id ?? '',
  );
  const [selectedPlayerCompareIntent, setSelectedPlayerCompareIntent] =
    useState<NpcDialogueIntent>('quest');
  const [playerModelDebugStatusMessage, setPlayerModelDebugStatusMessage] =
    useState<string | null>(null);
  const [busyPlayerModelDebugActionId, setBusyPlayerModelDebugActionId] =
    useState<string | null>(null);
  const [configResourceDebugStatusMessage, setConfigResourceDebugStatusMessage] =
    useState<string | null>(null);
  const [busyConfigResourceDebugActionId, setBusyConfigResourceDebugActionId] =
    useState<string | null>(null);
  const logs = useMemo(() => logEntries.slice(0, 8), [logEntries]);

  useEffect(() => {
    if (!selectedAreaId || !areas.some((area) => area.id === selectedAreaId)) {
      setSelectedAreaId(currentArea?.id ?? areas[0]?.id ?? null);
    }
  }, [areas, currentArea?.id, selectedAreaId]);

  useEffect(() => {
    if (!selectedQuestId || !questDefinitions.some((quest) => quest.id === selectedQuestId)) {
      const nextQuest =
        questDefinitions.find((quest) => quest.type === 'main') ??
        questDefinitions[0] ??
        null;
      setSelectedQuestId(nextQuest?.id ?? null);
    }
  }, [questDefinitions, selectedQuestId]);

  useEffect(() => {
    if (!selectedEventId || !eventDefinitions.some((event) => event.id === selectedEventId)) {
      const nextEvent =
        currentArea?.eventIds
          .map((eventId) => eventDefinitions.find((event) => event.id === eventId) ?? null)
          .find((event): event is NonNullable<typeof event> => event !== null) ??
        eventDefinitions[0] ??
        null;
      setSelectedEventId(nextEvent?.id ?? null);
    }
  }, [currentArea?.eventIds, eventDefinitions, selectedEventId]);

  useEffect(() => {
    if (!selectedNpcId || !npcDefinitions.some((npc) => npc.id === selectedNpcId)) {
      setSelectedNpcId(currentArea?.npcIds[0] ?? npcDefinitions[0]?.id ?? null);
    }
  }, [currentArea?.npcIds, npcDefinitions, selectedNpcId]);

  useEffect(() => {
    if (
      !selectedCombatEncounterId ||
      !combatEncounters.some((encounter) => encounter.id === selectedCombatEncounterId)
    ) {
      setSelectedCombatEncounterId(
        debugTools.forcedEncounterId ??
          combatState?.encounterId ??
          combatEncounters[0]?.id ??
          null,
      );
    }
  }, [
    combatEncounters,
    combatState?.encounterId,
    debugTools.forcedEncounterId,
    selectedCombatEncounterId,
  ]);

  useEffect(() => {
    setSelectedForcedTactic(debugTools.forcedTactic ?? '');
  }, [debugTools.forcedTactic]);

  useEffect(() => {
    setSelectedCombatPattern(
      debugTools.simulatedPlayerPattern ?? 'analysis-first',
    );
  }, [debugTools.simulatedPlayerPattern]);

  useEffect(() => {
    setCombatSeedValue(String(debugTools.combatSeed ?? 7));
  }, [debugTools.combatSeed]);

  useEffect(() => {
    setSelectedManualPlayerTags(playerModel.tags);
  }, [playerModel.tags]);

  useEffect(() => {
    if (selectedComparisonTags.length === 0) {
      setSelectedComparisonTags(playerModel.tags);
    }
  }, [playerModel.tags, selectedComparisonTags.length]);

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedAreaId) ?? currentArea ?? areas[0] ?? null,
    [areas, currentArea, selectedAreaId],
  );

  const selectedCombatEncounter = useMemo(
    () =>
      combatEncounters.find((encounter) => encounter.id === selectedCombatEncounterId) ??
      (combatState
        ? combatEncounters.find((encounter) => encounter.id === combatState.encounterId) ??
          null
        : null),
    [combatEncounters, combatState, selectedCombatEncounterId],
  );

  const selectedAreaEnvironment = useMemo(
    () =>
      selectedArea
        ? resolveAreaEnvironmentState(selectedArea, worldFlags)
        : null,
    [selectedArea, worldFlags],
  );

  const selectedNpc = useMemo(() => {
    if (!selectedNpcId) {
      return null;
    }

    const definition = npcDefinitions.find((npc) => npc.id === selectedNpcId);
    const state = npcStates.find((npc) => npc.npcId === selectedNpcId);
    const areaName =
      areas.find((area) => area.id === definition?.areaId)?.name ?? '未分配区域';

    if (!definition || !state) {
      return null;
    }

    return {
      definition,
      state,
      areaName,
    };
  }, [areas, npcDefinitions, npcStates, selectedNpcId]);

  useEffect(() => {
    const phaseOptions = selectedCombatEncounter?.bossPhases ?? [];
    const preferredPhaseId =
      debugTools.forcedPhaseId ??
      combatState?.currentPhaseId ??
      phaseOptions[0]?.id ??
      '';
    const hasSelectedPhase =
      selectedForcedPhaseId.length > 0 &&
      phaseOptions.some((phase) => phase.id === selectedForcedPhaseId);

    if (!hasSelectedPhase) {
      setSelectedForcedPhaseId(preferredPhaseId);
    }
  }, [
    combatState?.currentPhaseId,
    debugTools.forcedPhaseId,
    selectedCombatEncounter,
    selectedForcedPhaseId,
  ]);

  const syncNpcDebugInputs = useCallback((npcState: NpcState) => {
    setNpcTrustValue(String(npcState.trust));
    setNpcRelationshipValue(String(npcState.relationship));
    setNpcDispositionValue(npcState.currentDisposition);
    setNpcEmotionalStateValue(npcState.emotionalState);
    setNpcShortTermMemoryValue(npcState.memory.shortTerm.join('\n'));
    setNpcLongTermMemoryValue(npcState.memory.longTerm.join('\n'));
    setNpcCurrentGoalValue(npcState.currentGoal ?? '');
  }, []);

  useEffect(() => {
    if (!selectedNpc) {
      return;
    }

    syncNpcDebugInputs(selectedNpc.state);
    setNpcDebugStatusMessage(null);
    setLatestNpcOutcome(null);
  }, [selectedNpc, syncNpcDebugInputs]);

  useEffect(() => {
    if (!selectedArea) {
      setSelectedEnvironmentStateId(null);
      return;
    }

    const hasCurrentSelection = selectedArea.environment.states.some(
      (state) => state.id === selectedEnvironmentStateId,
    );

    if (hasCurrentSelection) {
      return;
    }

    setSelectedEnvironmentStateId(
      selectedAreaEnvironment?.id ??
        selectedArea.environment.activeStateId ??
        selectedArea.environment.states[0]?.id ??
        null,
    );
  }, [selectedArea, selectedAreaEnvironment?.id, selectedEnvironmentStateId]);

  const source = useMemo(
    () => ({
      worldSummary,
      worldRuntime,
      worldFlags,
      currentArea,
      areas,
      mapState,
      questDefinitions,
      questProgressEntries,
      npcDefinitions,
      npcStates,
      player,
      playerModel,
      explorationState,
      combatEncounters,
      combatState,
      eventDefinitions,
      eventHistory,
      eventDirector,
      review,
      gameConfig,
      saveMetadata,
      saveStatus,
      logEntries: logs,
    }),
    [
      areas,
      combatEncounters,
      combatState,
      currentArea,
      eventDefinitions,
      eventDirector,
      eventHistory,
      gameConfig,
      logs,
      mapState,
      npcDefinitions,
      npcStates,
      player,
      playerModel,
      explorationState,
      questDefinitions,
      questProgressEntries,
      review,
      saveMetadata,
      saveStatus,
      worldFlags,
      worldRuntime,
      worldSummary,
    ],
  );
  const configResourceDebugViewModel = useMemo(
    () =>
      buildConfigResourceDebugViewModel({
        gameConfig,
        resourceState,
        currentArea,
        npcDefinitions,
      }),
    [currentArea, gameConfig, npcDefinitions, resourceState],
  );

  const questDebugSnapshot = appQuestDebugController.getDebugSnapshot();
  const eventDebugSnapshot = appEventDebugController.getDebugSnapshot();
  const npcDispositionOptions = useMemo(
    () =>
      Object.entries(npcDispositionLabels).map(([value, label]) => ({
        value: value as NpcDisposition,
        label,
      })),
    [],
  );
  const npcEmotionalStateOptions = useMemo(
    () =>
      Object.entries(npcEmotionalStateLabels).map(([value, label]) => ({
        value: value as NpcEmotionalState,
        label,
      })),
    [],
  );
  const combatTacticOptions = useMemo(
    () =>
      (selectedCombatEncounter?.tacticPool ?? []).map((tactic) => ({
        value: tactic,
        label: formatEnemyTacticLabel(tactic),
      })),
    [selectedCombatEncounter],
  );
  const combatPhaseOptions = useMemo(
    () =>
      (selectedCombatEncounter?.bossPhases ?? []).map((phase) => ({
        value: phase.id,
        label: phase.label,
      })),
    [selectedCombatEncounter],
  );
  const combatPatternOptions = useMemo(
    () =>
      Object.entries(combatPatternLabels).map(([value, label]) => ({
        value: value as CombatDebugPlayerPattern,
        label,
      })),
    [],
  );
  const playerTagOptions = useMemo(
    () =>
      ([
        'exploration',
        'combat',
        'social',
        'story',
        'speedrun',
        'cautious',
        'risky',
      ] satisfies PlayerProfileTag[]).map((tag) => ({
        value: tag,
        label: formatPlayerTagLabel(tag),
      })),
    [],
  );
  const playerReplayOptions = useMemo(
    () =>
      playerModelBehaviorReplayPresets.map((preset) => ({
        value: preset.id,
        label: preset.label,
        description: preset.description,
        expectedTagLabels: preset.expectedTags.map(formatPlayerTagLabel),
      })),
    [],
  );
  const playerScenarioOptions = useMemo(
    () =>
      playerModelPresetScenarios.map((scenario) => ({
        value: scenario.id,
        label: scenario.label,
        description: scenario.description,
        expectedTagLabels: scenario.expectedTags.map(formatPlayerTagLabel),
      })),
    [],
  );
  const playerCompareIntentOptions = useMemo(
    () =>
      Object.entries(npcDialogueIntentLabels).map(([value, label]) => ({
        value: value as NpcDialogueIntent,
        label,
      })),
    [],
  );
  const playerModelSummaryViewModel = useMemo(() => {
    const debugSourceLabels = {
      'manual-tags': '手动标签注入',
      'behavior-replay': '行为回放生成',
      'preset-scenario': '预设场景生成',
    } as const;

    return {
      tagLabels: playerModel.tags.map(formatPlayerTagLabel),
      dominantStyleLabel: playerModel.dominantStyle
        ? formatPlayerTagLabel(playerModel.dominantStyle)
        : undefined,
      rationale: playerModel.rationale,
      riskForecast: playerModel.riskForecast,
      stuckPoint: playerModel.stuckPoint,
      injected: Boolean(playerModel.debugProfile?.injected),
      debugSourceLabel: playerModel.debugProfile
        ? debugSourceLabels[playerModel.debugProfile.source]
        : undefined,
      debugLabel: playerModel.debugProfile?.label,
      lastUpdatedAt: playerModel.lastUpdatedAt,
    };
  }, [playerModel]);
  const playerModelReactionPreview = useMemo(() => {
    const current = appPlayerModelController.previewSystemReactions({
      tags: playerModel.tags,
      rationale: playerModel.rationale,
      dominantStyle: playerModel.dominantStyle,
      riskForecast: playerModel.riskForecast,
      stuckPoint: playerModel.stuckPoint,
      npcIntent: selectedPlayerCompareIntent,
    });
    const candidate =
      selectedComparisonTags.length > 0
        ? appPlayerModelController.previewSystemReactions({
            tags: selectedComparisonTags,
            npcIntent: selectedPlayerCompareIntent,
          })
        : null;
    const buildViewModel = (
      tags: PlayerProfileTag[],
      preview: ReturnType<typeof appPlayerModelController.previewSystemReactions>,
    ) => ({
      tagLabels: tags.map(formatPlayerTagLabel),
      difficultyLabel: preview.difficulty.label,
      difficultySummary: preview.difficulty.summary,
      hintSummaries: preview.hints.map((hint) => hint.summary),
      npcReactionSummary: `在“${npcDialogueIntentLabels[selectedPlayerCompareIntent]}”意图下，信任 ${preview.npcReaction.trustDelta >= 0 ? '+' : ''}${preview.npcReaction.trustDelta}，关系 ${preview.npcReaction.relationshipDelta >= 0 ? '+' : ''}${preview.npcReaction.relationshipDelta}。`,
      npcReasonSummary:
        preview.npcReaction.reasons.length > 0
          ? preview.npcReaction.reasons.join('；')
          : undefined,
      enemyPriorityLabels: preview.enemyStrategy.tacticPriorities.map(
        formatEnemyTacticLabel,
      ),
      enemyReasonSummary:
        preview.enemyStrategy.reasons.length > 0
          ? preview.enemyStrategy.reasons.join('；')
          : undefined,
    });

    return {
      current: buildViewModel(playerModel.tags, current),
      candidate: candidate
        ? buildViewModel(selectedComparisonTags, candidate)
        : null,
    };
  }, [
    playerModel.dominantStyle,
    playerModel.rationale,
    playerModel.riskForecast,
    playerModel.stuckPoint,
    playerModel.tags,
    selectedComparisonTags,
    selectedPlayerCompareIntent,
  ]);
  const combatEncounterViewModels = useMemo(
    () =>
      combatEncounters.map((encounter) => ({
        id: encounter.id,
        title: encounter.title,
        areaName:
          areas.find((area) => area.id === encounter.areaId)?.name ?? '未分配区域',
        modeLabel: combatModeLabels[encounter.mode],
        phaseCount: encounter.bossPhases?.length ?? 0,
      })),
    [areas, combatEncounters],
  );
  const combatDebugViewModel = useMemo(() => {
    const encounter = combatState
      ? combatEncounters.find((entry) => entry.id === combatState.encounterId) ??
        selectedCombatEncounter
      : selectedCombatEncounter;
    const resolvePhaseLabel = (phaseId: string | undefined) =>
      encounter?.bossPhases?.find((phase) => phase.id === phaseId)?.label ??
      phaseId ??
      '未进入阶段';

    return {
      currentCombat: combatState
        ? {
            encounterTitle: encounter?.title ?? combatState.encounterId,
            modeLabel: encounter ? combatModeLabels[encounter.mode] : '未知模式',
            turn: combatState.turn,
            phaseLabel: resolvePhaseLabel(combatState.currentPhaseId),
            tacticLabel: formatEnemyTacticLabel(combatState.activeTactic),
            playerHpLabel: `${combatState.player.hp} / ${combatState.player.maxHp}`,
            enemyHpLabel: `${combatState.enemy.hp} / ${combatState.enemy.maxHp}`,
            resultLabel: combatState.result
              ? formatCombatResultLabel(combatState.result)
              : undefined,
          }
        : null,
      logs:
        combatState?.logs.map((log) => ({
          turn: log.turn,
          phaseLabel: resolvePhaseLabel(log.phaseId),
          tacticLabel: log.activeTactic
            ? formatEnemyTacticLabel(log.activeTactic)
            : '未记录战术',
          actions: log.actions.map((action) => action.description),
        })) ?? [],
      replaySummary: combatState
        ? {
            tacticChanges: summarizeCombatTacticChanges(combatState, encounter).map(
              (change) => change.summary,
            ),
            phaseChanges: summarizeCombatPhaseChanges(combatState, encounter).map(
              (change) => change.summary,
            ),
            keyPlayerBehaviors: summarizeCombatPlayerBehaviors(combatState).map(
              (behavior) => behavior.summary,
            ),
          }
        : null,
    };
  }, [combatEncounters, combatState, selectedCombatEncounter]);
  const npcDebugViewModels = useMemo(
    () =>
      npcDefinitions
        .map((definition) => {
          const runtime = npcStates.find((entry) => entry.npcId === definition.id);
          const areaName =
            areas.find((area) => area.id === definition.areaId)?.name ?? '未分配区域';

          if (!runtime) {
            return null;
          }

          return {
            id: definition.id,
            name: definition.name,
            role: definition.identity,
            areaName,
            disposition: npcDispositionLabels[runtime.currentDisposition],
            emotionalState: npcEmotionalStateLabels[runtime.emotionalState],
            trust: runtime.trust,
            relationship: runtime.relationship,
            shortTermMemory: runtime.memory.shortTerm,
            longTermMemory: runtime.memory.longTerm,
            currentGoal: runtime.currentGoal,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [areas, npcDefinitions, npcStates],
  );

  const selectedQuestSummary = useMemo(
    () =>
      questDebugSnapshot.quests.find((quest) => quest.questId === selectedQuestId) ??
      questDebugSnapshot.quests[0] ??
      null,
    [questDebugSnapshot.quests, selectedQuestId],
  );

  useEffect(() => {
    if (eventDebugSnapshot.history.length === 0) {
      setSelectedEventHistoryIndex(null);
      return;
    }

    const hasCurrentSelection =
      selectedEventHistoryIndex !== null &&
      eventDebugSnapshot.history.some((entry) => entry.index === selectedEventHistoryIndex);

    if (!hasCurrentSelection) {
      setSelectedEventHistoryIndex(
        eventDebugSnapshot.history[eventDebugSnapshot.history.length - 1]?.index ?? null,
      );
    }
  }, [eventDebugSnapshot.history, selectedEventHistoryIndex]);

  useEffect(() => {
    if (!selectedQuestSummary) {
      setSelectedQuestStageIndex(0);
      setSelectedQuestBranchId('');
      return;
    }

    setSelectedQuestStageIndex(
      Math.min(
        selectedQuestSummary.currentObjectiveIndex,
        Math.max(selectedQuestSummary.completionConditions.length - 1, 0),
      ),
    );
    setSelectedQuestBranchId(
      selectedQuestSummary.chosenBranchId ??
        selectedQuestSummary.branches[0]?.id ??
        '',
    );
  }, [selectedQuestSummary]);

  const handlePreviewControlSelect = useCallback((controlId: string) => {
    setPreviewControlId(controlId);
    setPreviewStatusMessage(`已在隔离预览中查看控件「${controlId}」。`);
  }, []);

  const handlePreviewMarkerActivate = useCallback((markerId: string) => {
    setPreviewStatusMessage(`已在不推进主流程的情况下预览场景标记「${markerId}」。`);
  }, []);

  const preview = useMemo(
    () =>
      buildRenderingPreviewViewModel({
        source,
        previewAreaId,
        forcedAreaId: debugTools.forcedAreaId,
        onMarkerActivate: handlePreviewMarkerActivate,
        onControlSelect: handlePreviewControlSelect,
        copy: debugText.renderLab,
        activeControlId: previewControlId,
        previewStatusMessage,
      }),
    [
      debugTools.forcedAreaId,
      handlePreviewControlSelect,
      handlePreviewMarkerActivate,
      previewAreaId,
      previewControlId,
      previewStatusMessage,
      source,
    ],
  );

  const launchScenario = async (task: () => Promise<unknown>) => {
    setIsLaunching(true);
    setErrorMessage(null);

    try {
      await task();
      patchDebugToolsState({ forcedAreaId: null });
      navigate('/game');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : debugText.unknownLaunchError,
      );
    } finally {
      setIsLaunching(false);
    }
  };

  const handlePreviewAreaSelect = useCallback((areaId: string) => {
    setPreviewAreaId(areaId);
    setPreviewControlId(null);
    setPreviewStatusMessage(null);
  }, []);

  const handleOpenForcedScene = useCallback(
    (areaId: string | null) => {
      if (!areaId) {
        return;
      }

      patchDebugToolsState({
        debugModeEnabled: true,
        forcedAreaId: areaId,
      });
      navigate('/game');
    },
    [navigate, patchDebugToolsState],
  );

  const handleClearForcedScene = useCallback(() => {
    patchDebugToolsState({ forcedAreaId: null });
    setPreviewControlId(null);
    setPreviewStatusMessage('已清除强制场景预览，主游戏界面会重新使用实时进度。');
  }, [patchDebugToolsState]);

  const runAreaDebugTask = useCallback(
    async <T,>(actionId: string, task: () => Promise<T>) => {
      setBusyAreaDebugActionId(actionId);
      setAreaDebugStatusMessage(null);

      try {
        return await task();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : debugText.unknownLaunchError;
        setAreaDebugStatusMessage(message);
        return null;
      } finally {
        setBusyAreaDebugActionId(null);
      }
    },
    [],
  );

  const runQuestDebugTask = useCallback(
    async <T,>(actionId: string, task: () => Promise<T>) => {
      setBusyQuestDebugActionId(actionId);
      setQuestDebugStatusMessage(null);

      try {
        return await task();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '任务调试执行失败。';
        setQuestDebugStatusMessage(message);
        return null;
      } finally {
        setBusyQuestDebugActionId(null);
      }
    },
    [],
  );

  const runEventDebugTask = useCallback(
    async <T,>(actionId: string, task: () => Promise<T>) => {
      setBusyEventDebugActionId(actionId);
      setEventDebugStatusMessage(null);

      try {
        return await task();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '事件调试执行失败。';
        setEventDebugStatusMessage(message);
        return null;
      } finally {
        setBusyEventDebugActionId(null);
      }
    },
    [],
  );

  const runNpcDebugTask = useCallback(
    async <T,>(actionId: string, task: () => Promise<T>) => {
      setBusyNpcDebugActionId(actionId);
      setNpcDebugStatusMessage(null);

      try {
        return await task();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '角色调试执行失败。';
        setNpcDebugStatusMessage(message);
        return null;
      } finally {
        setBusyNpcDebugActionId(null);
      }
    },
    [],
  );

  const runCombatDebugTask = useCallback(
    async <T,>(actionId: string, task: () => Promise<T>) => {
      setBusyCombatDebugActionId(actionId);
      setCombatDebugStatusMessage(null);

      try {
        return await task();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '战斗调试执行失败。';
        setCombatDebugStatusMessage(message);
        return null;
      } finally {
        setBusyCombatDebugActionId(null);
      }
    },
    [],
  );

  const runPlayerModelDebugTask = useCallback(
    async <T,>(actionId: string, task: () => Promise<T>) => {
      setBusyPlayerModelDebugActionId(actionId);
      setPlayerModelDebugStatusMessage(null);

      try {
        return await task();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '玩家画像调试执行失败。';
        setPlayerModelDebugStatusMessage(message);
        return null;
      } finally {
        setBusyPlayerModelDebugActionId(null);
      }
    },
    [],
  );

  const runConfigResourceDebugTask = useCallback(
    async <T,>(actionId: string, task: () => Promise<T>) => {
      setBusyConfigResourceDebugActionId(actionId);
      setConfigResourceDebugStatusMessage(null);

      try {
        return await task();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '配置与资源调试操作失败。';
        setConfigResourceDebugStatusMessage(message);
        return null;
      } finally {
        setBusyConfigResourceDebugActionId(null);
      }
    },
    [],
  );

  const handleApplyRuntimeProfile = useCallback(
    (profile: 'standard' | 'presentation' | 'dev') => {
      const targetLabel =
        configResourceDebugViewModel.profileOptions.find(
          (option) => option.id === profile,
        )?.label ?? '目标配置档';

      void runConfigResourceDebugTask(`profile:${profile}`, async () => {
        const result = await appConfigResourceDebugController.applyRuntimeProfile(
          profile,
        );

        setConfigResourceDebugStatusMessage(`已切换为${targetLabel}。`);
        return result;
      });
    },
    [configResourceDebugViewModel.profileOptions, runConfigResourceDebugTask],
  );

  const handleApplyConfigDifficulty = useCallback(
    (difficulty: GameDifficulty) => {
      const targetLabel =
        configResourceDebugViewModel.difficultyOptions.find(
          (option) => option.id === difficulty,
        )?.label ?? '目标难度';

      void runConfigResourceDebugTask(`difficulty:${difficulty}`, async () => {
        const result = await appConfigResourceDebugController.setDifficulty(
          difficulty,
        );

        setConfigResourceDebugStatusMessage(`已应用${targetLabel}。`);
        return result;
      });
    },
    [configResourceDebugViewModel.difficultyOptions, runConfigResourceDebugTask],
  );

  const handleToggleConfigAutosave = useCallback(() => {
    void runConfigResourceDebugTask('autosave:toggle', async () => {
      const nextEnabled = !gameConfig.autosaveEnabled;
      const result = await appConfigResourceDebugController.setAutosaveEnabled(
        nextEnabled,
      );

      setConfigResourceDebugStatusMessage(
        nextEnabled ? '已开启自动保存。' : '已关闭自动保存。',
      );
      return result;
    });
  }, [gameConfig.autosaveEnabled, runConfigResourceDebugTask]);

  const handleToggleConfigAutoLoad = useCallback(() => {
    void runConfigResourceDebugTask('autoload:toggle', async () => {
      const nextEnabled = !gameConfig.autoLoadEnabled;
      const result = await appConfigResourceDebugController.setAutoLoadEnabled(
        nextEnabled,
      );

      setConfigResourceDebugStatusMessage(
        nextEnabled ? '已开启自动读档。' : '已关闭自动读档。',
      );
      return result;
    });
  }, [gameConfig.autoLoadEnabled, runConfigResourceDebugTask]);

  const handleSyncAreaResources = useCallback(() => {
    if (!currentArea) {
      setConfigResourceDebugStatusMessage('当前没有可同步的区域资源。');
      return;
    }

    void runConfigResourceDebugTask('resource-sync', async () => {
      const result = await appConfigResourceDebugController.syncAreaResourceSelection(
        currentArea.id,
      );

      if (!result) {
        setConfigResourceDebugStatusMessage('当前没有可同步的区域资源。');
        return null;
      }

      setConfigResourceDebugStatusMessage('已按当前区域同步背景与音乐选择。');
      return result;
    });
  }, [currentArea, runConfigResourceDebugTask]);

  const handleToggleResourceLoaded = useCallback(
    (resourceKey: string, resourceLabel: string, shouldLoad: boolean) => {
      if (!resourceKey) {
        setConfigResourceDebugStatusMessage('当前条目没有可切换的资源。');
        return;
      }

      void runConfigResourceDebugTask(`resource:${resourceKey}`, async () => {
        const result = await appConfigResourceDebugController.setLoadedResource(
          resourceKey,
          shouldLoad,
        );

        setConfigResourceDebugStatusMessage(
          shouldLoad
            ? `已将“${resourceLabel}”标记为已加载。`
            : `已移除“${resourceLabel}”的加载标记。`,
        );
        return result;
      });
    },
    [runConfigResourceDebugTask],
  );

  const handleTriggerSelectedEvent = useCallback(() => {
    const event = eventDebugSnapshot.events.find((entry) => entry.eventId === selectedEventId);

    if (!event || !selectedEventId) {
      setEventDebugStatusMessage('请先选择一个事件。');
      return;
    }

    void runEventDebugTask('event-trigger', async () => {
      const result = await appEventDebugController.triggerEvent(selectedEventId);

      if (!result) {
        setEventDebugStatusMessage('事件手动触发失败。');
        return null;
      }

      setLatestEventOutcome(result);
      setSelectedEventHistoryIndex(eventDebugSnapshot.history.length);
      setEventDebugStatusMessage(`已手动触发“${event.title}”。`);
      return result;
    });
  }, [
    eventDebugSnapshot.events,
    eventDebugSnapshot.history.length,
    runEventDebugTask,
    selectedEventId,
  ]);

  const handleReplaySelectedEventHistory = useCallback(() => {
    const historyEntry = eventDebugSnapshot.history.find(
      (entry) => entry.index === selectedEventHistoryIndex,
    );

    if (!historyEntry || selectedEventHistoryIndex === null) {
      setEventDebugStatusMessage('当前没有可回放的历史事件。');
      return;
    }

    void runEventDebugTask('event-replay', async () => {
      const result = await appEventDebugController.replayEvent(selectedEventHistoryIndex);

      if (!result) {
        setEventDebugStatusMessage('历史事件回放失败。');
        return null;
      }

      setLatestEventOutcome(result);
      setSelectedEventId(result.eventId);
      setSelectedEventHistoryIndex(eventDebugSnapshot.history.length);
      setEventDebugStatusMessage(`已回放历史事件“${historyEntry.title}”。`);
      return result;
    });
  }, [eventDebugSnapshot.history, runEventDebugTask, selectedEventHistoryIndex]);

  const handleToggleEventRandomness = useCallback(() => {
    void runEventDebugTask('event-randomness', async () => {
      const disabled = !eventDebugSnapshot.director.randomnessDisabled;
      const result = await appEventDebugController.setRandomnessDisabled(disabled);

      setEventDebugStatusMessage(
        disabled
          ? '已关闭事件随机性，后续调试会保持稳定执行。'
          : '已恢复事件随机性。'
      );
      return result;
    });
  }, [eventDebugSnapshot.director.randomnessDisabled, runEventDebugTask]);

  const parseMemoryLines = useCallback(
    (value: string, limit: number) =>
      Array.from(
        new Set(
          value
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0),
        ),
      ).slice(0, limit),
    [],
  );

  const normalizeScoreInput = useCallback((value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  }, []);

  const handleStartCombatEncounter = useCallback(() => {
    if (!selectedCombatEncounterId) {
      setCombatDebugStatusMessage('请先选择一个战斗遭遇。');
      return;
    }

    void runCombatDebugTask('combat-start', async () => {
      await appDebugScenarioController.setSimulatedPlayerPattern(selectedCombatPattern);
      await appDebugScenarioController.setCombatSeed(Number(combatSeedValue));

      const result = await appDebugScenarioController.forceEncounter(
        selectedCombatEncounterId,
      );

      if (!result) {
        setCombatDebugStatusMessage('遭遇启动失败。');
        return null;
      }

      setCombatDebugStatusMessage(`已直接进入「${result.enemy.name}」战斗。`);
      return result;
    });
  }, [
    combatSeedValue,
    runCombatDebugTask,
    selectedCombatEncounterId,
    selectedCombatPattern,
  ]);

  const handleApplyForcedCombatTactic = useCallback(() => {
    if (!selectedForcedTactic) {
      setCombatDebugStatusMessage('请先选择要锁定的敌方战术。');
      return;
    }

    void runCombatDebugTask('combat-force-tactic', async () => {
      const result = await appDebugScenarioController.setForcedCombatTactic(
        selectedForcedTactic,
      );

      setCombatDebugStatusMessage(`已锁定敌方战术为「${formatEnemyTacticLabel(result!)}」。`);
      return result;
    });
  }, [runCombatDebugTask, selectedForcedTactic]);

  const handleClearForcedCombatTactic = useCallback(() => {
    void runCombatDebugTask('combat-clear-tactic', async () => {
      await appDebugScenarioController.setForcedCombatTactic(null);
      setSelectedForcedTactic('');
      setCombatDebugStatusMessage('已清除敌方战术锁定，后续回合会恢复常规决策。');
      return true;
    });
  }, [runCombatDebugTask]);

  const handleApplyForcedBossPhase = useCallback(() => {
    if (!selectedForcedPhaseId) {
      setCombatDebugStatusMessage('请先选择要锁定的首领阶段。');
      return;
    }

    const phaseLabel =
      combatPhaseOptions.find((option) => option.value === selectedForcedPhaseId)?.label ??
      selectedForcedPhaseId;

    void runCombatDebugTask('combat-force-phase', async () => {
      await appDebugScenarioController.setForcedBossPhase(selectedForcedPhaseId);
      setCombatDebugStatusMessage(`已锁定首领阶段为「${phaseLabel}」。`);
      return true;
    });
  }, [combatPhaseOptions, runCombatDebugTask, selectedForcedPhaseId]);

  const handleClearForcedBossPhase = useCallback(() => {
    void runCombatDebugTask('combat-clear-phase', async () => {
      await appDebugScenarioController.setForcedBossPhase(null);
      setSelectedForcedPhaseId('');
      setCombatDebugStatusMessage('已清除首领阶段锁定，后续将恢复常规阶段推进。');
      return true;
    });
  }, [runCombatDebugTask]);

  const handleSimulateCombatRounds = useCallback(() => {
    if (!combatState) {
      setCombatDebugStatusMessage('请先启动一场战斗，再执行回合模拟。');
      return;
    }

    void runCombatDebugTask('combat-simulate', async () => {
      await appDebugScenarioController.setSimulatedPlayerPattern(selectedCombatPattern);
      await appDebugScenarioController.setCombatSeed(Number(combatSeedValue));
      const result = await appDebugScenarioController.simulateCombatRounds(
        Number(combatSimulateRoundsValue),
      );

      if (result.length === 0) {
        setCombatDebugStatusMessage('本次没有推进新的战斗回合。');
        return result;
      }

      setCombatDebugStatusMessage(
        `已按「${combatPatternLabels[selectedCombatPattern]}」模拟 ${result.length} 个回合。`,
      );
      return result;
    });
  }, [
    combatSeedValue,
    combatSimulateRoundsValue,
    combatState,
    runCombatDebugTask,
    selectedCombatPattern,
  ]);

  const handleToggleManualPlayerTag = useCallback((tag: PlayerProfileTag) => {
    setSelectedManualPlayerTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
    );
  }, []);

  const handleToggleComparisonPlayerTag = useCallback((tag: PlayerProfileTag) => {
    setSelectedComparisonTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
    );
  }, []);

  const handleApplyManualPlayerTags = useCallback(() => {
    if (selectedManualPlayerTags.length === 0) {
      setPlayerModelDebugStatusMessage('请至少选择一个玩家标签。');
      return;
    }

    void runPlayerModelDebugTask('player-model-manual', async () => {
      const result = await appDebugScenarioController.injectPlayerTags(
        selectedManualPlayerTags,
        '手动标签注入',
      );

      if (!result) {
        setPlayerModelDebugStatusMessage('玩家画像标签注入失败。');
        return null;
      }

      setPlayerModelDebugStatusMessage(
        `已将玩家画像切换为：${selectedManualPlayerTags
          .map(formatPlayerTagLabel)
          .join('、')}。`,
      );
      return result;
    });
  }, [runPlayerModelDebugTask, selectedManualPlayerTags]);

  const handleReplayPlayerBehavior = useCallback(() => {
    if (!selectedPlayerReplayId) {
      setPlayerModelDebugStatusMessage('请先选择一个行为回放预设。');
      return;
    }

    const replay = playerModelBehaviorReplayPresets.find(
      (preset) => preset.id === selectedPlayerReplayId,
    );

    void runPlayerModelDebugTask('player-model-replay', async () => {
      const result = await appDebugScenarioController.replayPlayerBehaviorPreset(
        selectedPlayerReplayId,
      );

      if (!result) {
        setPlayerModelDebugStatusMessage('行为回放生成失败。');
        return null;
      }

      setPlayerModelDebugStatusMessage(
        `已按「${replay?.label ?? '回放预设'}」重建玩家画像。`,
      );
      return result;
    });
  }, [runPlayerModelDebugTask, selectedPlayerReplayId]);

  const handleApplyPlayerScenario = useCallback(() => {
    if (!selectedPlayerScenarioId) {
      setPlayerModelDebugStatusMessage('请先选择一个玩家画像场景。');
      return;
    }

    const scenario = playerModelPresetScenarios.find(
      (entry) => entry.id === selectedPlayerScenarioId,
    );

    void runPlayerModelDebugTask('player-model-scenario', async () => {
      const result = await appDebugScenarioController.applyPlayerModelScenario(
        selectedPlayerScenarioId,
      );

      if (!result) {
        setPlayerModelDebugStatusMessage('玩家画像场景应用失败。');
        return null;
      }

      setPlayerModelDebugStatusMessage(
        `已应用「${scenario?.label ?? '预设场景'}」画像场景。`,
      );
      return result;
    });
  }, [runPlayerModelDebugTask, selectedPlayerScenarioId]);

  const handleClearInjectedPlayerProfile = useCallback(() => {
    void runPlayerModelDebugTask('player-model-clear', async () => {
      const result = await appDebugScenarioController.clearInjectedPlayerProfile();

      if (!result) {
        setPlayerModelDebugStatusMessage('当前没有需要清除的调试画像，已保持自然推导结果。');
        return null;
      }

      setPlayerModelDebugStatusMessage('已清除调试注入，并恢复为基于行为记录的自然画像。');
      return result;
    });
  }, [runPlayerModelDebugTask]);

  const handleActivateQuest = useCallback(
    (questId: string) => {
      const quest = questDebugSnapshot.quests.find((entry) => entry.questId === questId);

      if (!quest) {
        setQuestDebugStatusMessage('未找到要调试的任务。');
        return;
      }

      void runQuestDebugTask('quest-activate', async () => {
        const result = await appQuestDebugController.activateQuest(questId);

        if (!result) {
          setQuestDebugStatusMessage('任务激活失败。');
          return null;
        }

        setQuestDebugStatusMessage(`已将「${quest.title}」设为进行中。`);
        return result;
      });
    },
    [questDebugSnapshot.quests, runQuestDebugTask],
  );

  const handleSetQuestStatus = useCallback(
    (questId: string, status: 'completed' | 'failed') => {
      const quest = questDebugSnapshot.quests.find((entry) => entry.questId === questId);

      if (!quest) {
        setQuestDebugStatusMessage('未找到要调试的任务。');
        return;
      }

      void runQuestDebugTask(`quest-status-${status}`, async () => {
        const result = await appQuestDebugController.setQuestStatus(questId, status);

        if (!result) {
          setQuestDebugStatusMessage('任务状态更新失败。');
          return null;
        }

        setQuestDebugStatusMessage(
          status === 'completed'
            ? `已直接完成「${quest.title}」。`
            : `已直接判定「${quest.title}」失败。`,
        );
        return result;
      });
    },
    [questDebugSnapshot.quests, runQuestDebugTask],
  );

  const handleChooseQuestBranch = useCallback(
    (questId: string, branchId: string) => {
      const quest = questDebugSnapshot.quests.find((entry) => entry.questId === questId);
      const branch = quest?.branches.find((entry) => entry.id === branchId);

      if (!quest || !branch) {
        setQuestDebugStatusMessage('当前任务没有可用分支。');
        return;
      }

      void runQuestDebugTask('quest-branch', async () => {
        const result = await appQuestDebugController.chooseBranch(questId, branchId);

        if (!result || 'ok' in result && result.ok === false) {
          setQuestDebugStatusMessage('分支应用失败，请先满足分支前置条件。');
          return null;
        }

        setQuestDebugStatusMessage(`已将「${quest.title}」切换到分支「${branch.label}」。`);
        return result;
      });
    },
    [questDebugSnapshot.quests, runQuestDebugTask],
  );

  const handleJumpQuestStage = useCallback(
    (questId: string, stageIndex: number, branchId?: string) => {
      const quest = questDebugSnapshot.quests.find((entry) => entry.questId === questId);

      if (!quest) {
        setQuestDebugStatusMessage('未找到要调试的任务。');
        return;
      }

      void runQuestDebugTask('quest-stage', async () => {
        const result = await appQuestDebugController.jumpToStage({
          questId,
          stageIndex,
          chosenBranchId: branchId || undefined,
        });

        if (!result) {
          setQuestDebugStatusMessage('阶段跳转失败。');
          return null;
        }

        setQuestDebugStatusMessage(
          `已将「${quest.title}」跳到第 ${stageIndex + 1} 阶验证节点。`,
        );
        return result;
      });
    },
    [questDebugSnapshot.quests, runQuestDebugTask],
  );

  const handleSimulateQuestCondition = useCallback(
    (questId: string, conditionId: string) => {
      const quest = questDebugSnapshot.quests.find((entry) => entry.questId === questId);
      const condition =
        quest?.triggerConditions.find((entry) => entry.id === conditionId) ??
        quest?.completionConditions.find((entry) => entry.id === conditionId) ??
        quest?.failureConditions.find((entry) => entry.id === conditionId);

      if (!quest || !condition) {
        setQuestDebugStatusMessage('未找到要模拟的任务条件。');
        return;
      }

      void runQuestDebugTask(`quest-condition-${conditionId}`, async () => {
        const result = await appQuestDebugController.simulateCondition({
          questId,
          conditionId,
        });

        if (!result) {
          setQuestDebugStatusMessage('条件模拟失败。');
          return null;
        }

        setQuestDebugStatusMessage(`已模拟条件「${condition.label}」。`);
        return result;
      });
    },
    [questDebugSnapshot.quests, runQuestDebugTask],
  );

  const handleResetQuestDebug = useCallback(
    (questId: string) => {
      const quest = questDebugSnapshot.quests.find((entry) => entry.questId === questId);

      if (!quest) {
        setQuestDebugStatusMessage('未找到要回退的任务。');
        return;
      }

      void runQuestDebugTask('quest-reset', async () => {
        const result = await appQuestDebugController.resetQuest(questId);

        if (!result) {
          setQuestDebugStatusMessage('当前任务还没有可回退的调试快照。');
          return null;
        }

        setQuestDebugStatusMessage(`已将「${quest.title}」回退到首次调试前的快照。`);
        return result;
      });
    },
    [questDebugSnapshot.quests, runQuestDebugTask],
  );

  const handleApplyNpcInjection = useCallback(() => {
    if (!selectedNpc) {
      setNpcDebugStatusMessage('未找到要调试的角色。');
      return;
    }

    void runNpcDebugTask('npc-inject', async () => {
      const nextState = await appDebugScenarioController.injectNpcState({
        npcId: selectedNpc.definition.id,
        trust: normalizeScoreInput(npcTrustValue, selectedNpc.state.trust),
        relationship: normalizeScoreInput(
          npcRelationshipValue,
          selectedNpc.state.relationship,
        ),
        currentDisposition: npcDispositionValue,
        emotionalState: npcEmotionalStateValue,
        shortTermMemory: parseMemoryLines(npcShortTermMemoryValue, 5),
        longTermMemory: parseMemoryLines(npcLongTermMemoryValue, 8),
        currentGoal: npcCurrentGoalValue.trim() || undefined,
      });

      if (!nextState) {
        setNpcDebugStatusMessage('角色状态注入失败。');
        return null;
      }

      setNpcDebugStatusMessage(`已写入 ${selectedNpc.definition.name} 的调试状态。`);
      return nextState;
    });
  }, [
    normalizeScoreInput,
    npcCurrentGoalValue,
    npcDispositionValue,
    npcEmotionalStateValue,
    npcRelationshipValue,
    npcShortTermMemoryValue,
    npcLongTermMemoryValue,
    npcTrustValue,
    parseMemoryLines,
    runNpcDebugTask,
    selectedNpc,
  ]);

  const handleOpenNpcDialogue = useCallback(() => {
    if (!selectedNpc) {
      setNpcDebugStatusMessage('未找到要打开对话的角色。');
      return;
    }

    void runNpcDebugTask('npc-open', async () => {
      const session = await appDebugScenarioController.openNpcDialogue(
        selectedNpc.definition.id,
      );

      if (!session) {
        setNpcDebugStatusMessage('当前无法直接打开该角色对话。');
        return null;
      }

      navigate('/game');
      return session;
    });
  }, [navigate, runNpcDebugTask, selectedNpc]);

  const handleTestNpcBranch = useCallback(
    (intent: NpcDialogueIntent) => {
      if (!selectedNpc) {
        setNpcDebugStatusMessage('未找到要测试的角色。');
        return;
      }

      void runNpcDebugTask(`npc-branch:${intent}`, async () => {
        const result = await appDebugScenarioController.testNpcDialogueBranch(
          selectedNpc.definition.id,
          intent,
        );

        if (!result?.explanation) {
          setNpcDebugStatusMessage('角色分支测试失败。');
          return null;
        }

        setLatestNpcOutcome({
          npcName: result.npcName,
          optionLabel: npcDialogueIntentLabels[intent],
          attitudeLabel: result.explanation.attitudeLabel,
          emotionalStateLabel: result.explanation.emotionalStateLabel,
          trustDelta: result.explanation.trust.delta,
          relationshipDelta: result.explanation.relationship.delta,
          trustReasons: result.explanation.trust.reasons,
          relationshipReasons: result.explanation.relationship.reasons,
          decisionBasis: result.explanation.decisionBasis,
          debugSummary: result.explanation.debugSummary,
        });
        setNpcDebugStatusMessage(
          `已完成 ${selectedNpc.definition.name} 的${npcDialogueIntentLabels[intent]}分支测试。`,
        );
        return result;
      });
    },
    [runNpcDebugTask, selectedNpc],
  );

  const handleResetNpcDebug = useCallback(() => {
    if (!selectedNpc) {
      setNpcDebugStatusMessage('未找到要回滚的角色。');
      return;
    }

    void runNpcDebugTask('npc-reset', async () => {
      const restoredState = await appDebugScenarioController.resetNpcDebugState(
        selectedNpc.definition.id,
      );

      if (!restoredState) {
        setNpcDebugStatusMessage('当前角色还没有可回滚的测试快照。');
        return null;
      }

      syncNpcDebugInputs(restoredState);
      setLatestNpcOutcome(null);
      setNpcDebugStatusMessage(`已回滚 ${selectedNpc.definition.name} 的调试测试快照。`);
      return restoredState;
    });
  }, [runNpcDebugTask, selectedNpc, syncNpcDebugInputs]);

  const handleJumpToArea = useCallback(
    (openGameRoute: boolean) => {
      if (!selectedArea) {
        setAreaDebugStatusMessage(debugText.areaTools.noAreaSelected);
        return;
      }

      void runAreaDebugTask(
        openGameRoute ? 'jump-open' : 'jump',
        async () => {
          const result = await appAreaDebugController.jumpToArea(selectedArea.id);

          if (!result) {
            setAreaDebugStatusMessage(debugText.areaTools.noAreaSelected);
            return null;
          }

          setAreaDebugStatusMessage(
            openGameRoute
              ? `已跳转到「${selectedArea.name}」，并打开实时游戏路线。`
              : `已把实时状态跳到「${selectedArea.name}」，现在可直接测试进出与返回流程。`,
          );

          if (openGameRoute) {
            navigate('/game');
          }

          return result;
        },
      );
    },
    [navigate, runAreaDebugTask, selectedArea],
  );

  const handleAreaUnlockToggle = useCallback(
    (unlocked: boolean) => {
      if (!selectedArea) {
        setAreaDebugStatusMessage(debugText.areaTools.noAreaSelected);
        return;
      }

      void runAreaDebugTask(
        unlocked ? 'unlock' : 'relock',
        async () => {
          const result = await appAreaDebugController.setAreaUnlocked(
            selectedArea.id,
            unlocked,
          );

          if (!result) {
            setAreaDebugStatusMessage(debugText.areaTools.noAreaSelected);
            return null;
          }

          if (!result.ok) {
            setAreaDebugStatusMessage(result.reason ?? '区域通行调试更新失败。');
            return result;
          }

          setAreaDebugStatusMessage(
            unlocked
              ? `「${selectedArea.name}」现已解锁，可直接测试实时路线。`
              : `已在运行时状态中重新锁定「${selectedArea.name}」。`,
          );

          return result;
        },
      );
    },
    [runAreaDebugTask, selectedArea],
  );

  const handleApplyEnvironment = useCallback(() => {
    if (!selectedArea || !selectedEnvironmentStateId) {
      setAreaDebugStatusMessage(debugText.areaTools.noAreaSelected);
      return;
    }

    void runAreaDebugTask('environment', async () => {
      const result = await appAreaDebugController.simulateEnvironmentState(
        selectedArea.id,
        selectedEnvironmentStateId,
      );

      if (!result) {
        setAreaDebugStatusMessage(debugText.areaTools.noAreaSelected);
        return null;
      }

      if (!result.ok) {
        setAreaDebugStatusMessage(
          result.reason ??
            `已对「${selectedArea.name}」写入调试标记，但解析出的环境状态与目标状态不一致。`,
        );
        return result;
      }

      setAreaDebugStatusMessage(
        `已为「${selectedArea.name}」应用环境「${result.resolvedState?.label ?? selectedEnvironmentStateId}」。`,
      );
      return result;
    });
  }, [
    runAreaDebugTask,
    selectedArea,
    selectedEnvironmentStateId,
  ]);

  const selectedAreaIsUnlocked = selectedArea
    ? selectedArea.unlockedByDefault ||
      mapState.unlockedAreaIds.includes(selectedArea.id)
    : false;
  const selectedAreaIsDiscovered = selectedArea
    ? mapState.discoveredAreaIds.includes(selectedArea.id)
    : false;
  const selectedAreaIsHidden = selectedArea
    ? (selectedArea.isHiddenUntilDiscovered ?? selectedArea.type === 'hidden')
    : false;
  const debugSections = [
    { id: 'scenarios', label: '快捷场景', href: '#debug-scenarios', isActive: true },
    { id: 'world', label: '区域配置', href: '#debug-world' },
    { id: 'quests', label: '任务', href: '#debug-quests' },
    { id: 'events', label: '事件', href: '#debug-events' },
    { id: 'npc', label: '角色', href: '#debug-npc' },
    { id: 'player', label: '玩家模型', href: '#debug-player' },
    { id: 'combat', label: '战斗', href: '#debug-combat' },
    { id: 'render', label: '渲染', href: '#debug-render' },
    { id: 'logs', label: '运行日志', href: '#debug-logs' },
  ];

  return (
    <PageFrame
      title={debugText.title}
      description={debugText.description}
      navigation={<PixelTabs items={debugSections} label="调试页面分区" />}
    >
      <SectionCard
        id="debug-scenarios"
        title={debugText.scenarioShortcuts.title}
        eyebrow={debugText.scenarioShortcuts.eyebrow}
        description={debugText.scenarioShortcuts.description}
        footer={debugText.scenarioShortcuts.footer}
      >
        <div className="hero-callout__actions">
          <button
            className="pixel-button"
            disabled={isLaunching}
            type="button"
            onClick={() =>
              void launchScenario(() =>
                appWorldCreationController.createWorldFromTemplate('template:ward-network'),
              )
            }
          >
            {debugText.scenarioShortcuts.templateWorldAction}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={isLaunching}
            type="button"
            onClick={() =>
              void launchScenario(() => appWorldCreationController.createQuickPlayWorld())
            }
          >
            {debugText.scenarioShortcuts.quickPlayAction}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={isLaunching}
            type="button"
            onClick={() =>
              void launchScenario(() => appWorldCreationController.createDevTestWorld())
            }
          >
            {debugText.scenarioShortcuts.devModeAction}
          </button>
        </div>
      </SectionCard>

      {errorMessage ? (
        <section className="startup-status-card startup-status-card--error">
          <Badge tone="warning">{debugText.launchErrorBadge}</Badge>
          <p className="startup-status-card__body">{errorMessage}</p>
        </section>
      ) : null}

      <SectionCard
        id="debug-world"
        title={debugText.areaTools.title}
        eyebrow={debugText.areaTools.eyebrow(selectedArea?.name ?? '—')}
        description={debugText.areaTools.description}
        footer={debugText.areaTools.footer}
      >
        <form className="world-creation-form">
          <label className="world-creation-form__field">
            <span>{debugText.areaTools.areaField}</span>
            <select
              value={selectedArea?.id ?? ''}
              onChange={(event) => {
                setSelectedAreaId(event.target.value);
                setAreaDebugStatusMessage(null);
              }}
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>

          <label className="world-creation-form__field">
            <span>{debugText.areaTools.environmentField}</span>
            <select
              disabled={!selectedArea}
              value={selectedEnvironmentStateId ?? ''}
              onChange={(event) => setSelectedEnvironmentStateId(event.target.value)}
            >
              {(selectedArea?.environment.states ?? []).map((state) => (
                <option key={state.id} value={state.id}>
                  {state.label}
                </option>
              ))}
            </select>
          </label>
        </form>

        <ul className="section-card__list">
          <li>
            {debugText.areaTools.currentAreaLabel}: {currentArea?.name ?? '—'}
          </li>
          <li>
            {debugText.areaTools.selectedAreaLabel}: {selectedArea?.name ?? '—'}
          </li>
          <li>
            {debugText.areaTools.lockStatusLabel(
              selectedAreaIsUnlocked
                ? debugText.areaTools.unlockStateUnlocked
                : debugText.areaTools.unlockStateLocked,
            )}
          </li>
          <li>
            {debugText.areaTools.discoveryStatusLabel(
              selectedAreaIsDiscovered
                ? debugText.areaTools.discoveryStateDiscovered
                : debugText.areaTools.discoveryStateHidden,
            )}
          </li>
          <li>
            {debugText.areaTools.hiddenStatusLabel(
              selectedAreaIsHidden
                ? debugText.areaTools.hiddenStateHidden
                : debugText.areaTools.hiddenStateVisible,
            )}
          </li>
          <li>
            {debugText.areaTools.currentEnvironmentLabel(
              selectedAreaEnvironment?.label ?? '—',
            )}
          </li>
        </ul>

        {selectedAreaIsHidden ? (
          <p className="section-card__description">{debugText.areaTools.hiddenAreaHint}</p>
        ) : null}

        {!selectedArea?.unlockedByDefault ? null : (
          <p className="section-card__description">
            {debugText.areaTools.relockDisabledDefault}
          </p>
        )}

        <div className="hero-callout__actions">
          <button
            className="pixel-button"
            disabled={!selectedArea || busyAreaDebugActionId !== null}
            type="button"
            onClick={() => handleJumpToArea(false)}
          >
            {debugText.areaTools.jumpAction}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={!selectedArea || busyAreaDebugActionId !== null}
            type="button"
            onClick={() => handleJumpToArea(true)}
          >
            {debugText.areaTools.jumpAndOpenAction}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={!selectedArea || busyAreaDebugActionId !== null}
            type="button"
            onClick={() => handleAreaUnlockToggle(true)}
          >
            {debugText.areaTools.unlockAction}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={
              !selectedArea ||
              selectedArea.unlockedByDefault ||
              selectedArea.id === currentArea?.id ||
              busyAreaDebugActionId !== null
            }
            type="button"
            onClick={() => handleAreaUnlockToggle(false)}
          >
            {debugText.areaTools.relockAction}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={!selectedArea || !selectedEnvironmentStateId || busyAreaDebugActionId !== null}
            type="button"
            onClick={handleApplyEnvironment}
          >
            {debugText.areaTools.applyEnvironmentAction}
          </button>
        </div>

        {areaDebugStatusMessage ? (
          <p className="section-card__footer">{areaDebugStatusMessage}</p>
        ) : null}
      </SectionCard>

      <ConfigResourceDebugPanel
        viewModel={configResourceDebugViewModel}
        busyActionId={busyConfigResourceDebugActionId}
        statusMessage={configResourceDebugStatusMessage}
        onApplyProfile={handleApplyRuntimeProfile}
        onApplyDifficulty={handleApplyConfigDifficulty}
        onToggleAutosave={handleToggleConfigAutosave}
        onToggleAutoLoad={handleToggleConfigAutoLoad}
        onSyncAreaResources={handleSyncAreaResources}
        onToggleResourceLoaded={handleToggleResourceLoaded}
      />

      <section id="debug-quests">
        <QuestDebugPanel
          snapshot={questDebugSnapshot}
          selectedQuestId={selectedQuestSummary?.questId ?? null}
          selectedStageIndex={selectedQuestStageIndex}
          selectedBranchId={selectedQuestBranchId}
          busyActionId={busyQuestDebugActionId}
          statusMessage={questDebugStatusMessage}
          onSelectQuest={setSelectedQuestId}
          onStageIndexChange={setSelectedQuestStageIndex}
          onBranchIdChange={setSelectedQuestBranchId}
          onActivateQuest={handleActivateQuest}
          onSetQuestStatus={handleSetQuestStatus}
          onChooseBranch={handleChooseQuestBranch}
          onJumpToStage={handleJumpQuestStage}
          onSimulateCondition={handleSimulateQuestCondition}
          onResetQuest={handleResetQuestDebug}
        />
      </section>

      <section id="debug-events">
        <EventDebugPanel
          snapshot={eventDebugSnapshot}
          selectedEventId={selectedEventId}
          selectedHistoryIndex={selectedEventHistoryIndex}
          latestOutcome={latestEventOutcome}
          busyActionId={busyEventDebugActionId}
          statusMessage={eventDebugStatusMessage}
          onSelectEvent={(eventId) => {
            setSelectedEventId(eventId);
            setEventDebugStatusMessage(null);
          }}
          onSelectHistoryIndex={(historyIndex) => {
            setSelectedEventHistoryIndex(historyIndex);
            setEventDebugStatusMessage(null);
          }}
          onTriggerSelectedEvent={handleTriggerSelectedEvent}
          onReplaySelectedHistory={handleReplaySelectedEventHistory}
          onToggleRandomness={handleToggleEventRandomness}
        />
      </section>

      <section id="debug-npc">
        <NpcDebugPanel
          npcs={npcDebugViewModels}
          selectedNpcId={selectedNpc?.definition.id ?? null}
          trustValue={npcTrustValue}
          relationshipValue={npcRelationshipValue}
          dispositionValue={npcDispositionValue}
          emotionalStateValue={npcEmotionalStateValue}
          shortTermMemoryValue={npcShortTermMemoryValue}
          longTermMemoryValue={npcLongTermMemoryValue}
          currentGoalValue={npcCurrentGoalValue}
          statusMessage={npcDebugStatusMessage}
          busyActionId={busyNpcDebugActionId}
          latestOutcome={latestNpcOutcome}
          dispositionOptions={npcDispositionOptions}
          emotionalStateOptions={npcEmotionalStateOptions}
          onSelectNpc={setSelectedNpcId}
          onTrustChange={setNpcTrustValue}
          onRelationshipChange={setNpcRelationshipValue}
          onDispositionChange={setNpcDispositionValue}
          onEmotionalStateChange={setNpcEmotionalStateValue}
          onShortTermMemoryChange={setNpcShortTermMemoryValue}
          onLongTermMemoryChange={setNpcLongTermMemoryValue}
          onCurrentGoalChange={setNpcCurrentGoalValue}
          onApplyInjection={handleApplyNpcInjection}
          onOpenDialogue={handleOpenNpcDialogue}
          onTestBranch={handleTestNpcBranch}
          onResetOutcome={handleResetNpcDebug}
        />
      </section>

      <section id="debug-player">
        <PlayerModelDebugPanel
        summary={playerModelSummaryViewModel}
        manualTagOptions={playerTagOptions}
        manualSelectedTags={selectedManualPlayerTags}
        comparisonSelectedTags={selectedComparisonTags}
        replayOptions={playerReplayOptions}
        scenarioOptions={playerScenarioOptions}
        npcIntentOptions={playerCompareIntentOptions}
        selectedReplayId={selectedPlayerReplayId}
        selectedScenarioId={selectedPlayerScenarioId}
        selectedComparisonNpcIntent={selectedPlayerCompareIntent}
        statusMessage={playerModelDebugStatusMessage}
        busyActionId={busyPlayerModelDebugActionId}
        currentReaction={playerModelReactionPreview.current}
        comparisonReaction={playerModelReactionPreview.candidate}
        onToggleManualTag={handleToggleManualPlayerTag}
        onToggleComparisonTag={handleToggleComparisonPlayerTag}
        onSelectReplay={setSelectedPlayerReplayId}
        onSelectScenario={setSelectedPlayerScenarioId}
        onSelectComparisonNpcIntent={setSelectedPlayerCompareIntent}
        onApplyManualTags={handleApplyManualPlayerTags}
        onReplayBehavior={handleReplayPlayerBehavior}
        onApplyScenario={handleApplyPlayerScenario}
        onClearInjected={handleClearInjectedPlayerProfile}
        />
      </section>

      <section id="debug-combat">
        <CombatDebugPanel
        encounters={combatEncounterViewModels}
        selectedEncounterId={selectedCombatEncounterId}
        selectedTactic={selectedForcedTactic}
        selectedPhaseId={selectedForcedPhaseId}
        selectedPattern={selectedCombatPattern}
        seedValue={combatSeedValue}
        simulateRoundsValue={combatSimulateRoundsValue}
        busyActionId={busyCombatDebugActionId}
        statusMessage={combatDebugStatusMessage}
        currentCombat={combatDebugViewModel.currentCombat}
        logs={combatDebugViewModel.logs}
        replaySummary={combatDebugViewModel.replaySummary}
        tacticOptions={combatTacticOptions}
        phaseOptions={combatPhaseOptions}
        patternOptions={combatPatternOptions}
        onSelectEncounter={setSelectedCombatEncounterId}
        onSelectTactic={setSelectedForcedTactic}
        onSelectPhase={setSelectedForcedPhaseId}
        onSelectPattern={setSelectedCombatPattern}
        onSeedChange={setCombatSeedValue}
        onSimulateRoundsChange={setCombatSimulateRoundsValue}
        onStartEncounter={handleStartCombatEncounter}
        onApplyForcedTactic={handleApplyForcedCombatTactic}
        onClearForcedTactic={handleClearForcedCombatTactic}
        onApplyForcedPhase={handleApplyForcedBossPhase}
        onClearForcedPhase={handleClearForcedBossPhase}
        onSimulateRounds={handleSimulateCombatRounds}
        />
      </section>

      {debugFeatureFlags.renderingTools ? (
        <section id="debug-render">
          <RenderingPreviewGallery
            preview={preview}
            onPreviewAreaSelect={handlePreviewAreaSelect}
            onOpenForcedScene={handleOpenForcedScene}
            onClearForcedScene={handleClearForcedScene}
          />
        </section>
      ) : (
        <SectionCard
          title="渲染预览已收起"
          eyebrow="调试配置"
          description="当前配置已关闭渲染预览工具，避免演示模式暴露额外调试面板。"
        >
          <p>如需启用完整渲染预览，请切换到标准或开发调试配置。</p>
        </SectionCard>
      )}

      <div className="panel-grid panel-grid--two">
        {debugPanels.map((panel) => (
          <DebugPanel key={panel.title} panel={panel} />
        ))}
        <SectionCard
          id="debug-logs"
          title={debugText.runtimeLogs.title}
          eyebrow={debugText.runtimeLogs.eyebrow(logs.length)}
          description={debugText.runtimeLogs.description}
          footer={debugText.runtimeLogs.footer}
        >
          <ul className="section-card__list">
            {logs.length === 0 ? (
              <li>{debugText.runtimeLogs.emptyState}</li>
            ) : (
              logs.map((entry) => (
                <li key={entry.id}>
                  [{entry.kind}] {entry.summary}
                </li>
              ))
            )}
          </ul>
        </SectionCard>
      </div>
    </PageFrame>
  );
}
