import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import {
  appAreaDebugController,
  appDebugScenarioController,
  appQuestDebugController,
  appWorldCreationController,
} from '../../app/runtime/appRuntime';
import { RenderingPreviewGallery } from '../../components/debug/RenderingPreviewGallery';
import { DebugPanel } from '../../components/debug/DebugPanel';
import { NpcDebugPanel } from '../../components/debug/NpcDebugPanel';
import { QuestDebugPanel } from '../../components/debug/QuestDebugPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { useGameLogStore } from '../../core/logging';
import { debugPanels } from '../../core/mocks/shellContent';
import { resolveAreaEnvironmentState } from '../../core/rules';
import type {
  NpcDialogueIntent,
  NpcDisposition,
  NpcEmotionalState,
  NpcState,
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
  selectMapState,
  selectNpcDefinitions,
  selectNpcStates,
  selectPlayerModelState,
  selectPlayerState,
  selectQuestDefinitions,
  selectQuestProgressEntries,
  selectSaveMetadata,
  selectSaveStatus,
  selectWorldFlags,
  selectWorldRuntime,
  selectWorldSummary,
  useGameStore,
} from '../../core/state';
import {
  npcDispositionLabels,
  npcDialogueIntentLabels,
  npcEmotionalStateLabels,
} from '../../core/utils/displayLabels';
import { locale } from '../../core/utils/locale';
import { buildRenderingPreviewViewModel } from './renderingPreviewViewModel';

const debugText = locale.pages.debug;

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
  const combatEncounters = useGameStore(useShallow(selectCombatEncounters));
  const combatState = useGameStore(selectCombatState);
  const eventDefinitions = useGameStore(useShallow(selectEventDefinitions));
  const eventHistory = useGameStore(selectEventHistory);
  const eventDirector = useGameStore(selectEventDirector);
  const review = useGameStore(selectCurrentReview);
  const saveMetadata = useGameStore(selectSaveMetadata);
  const saveStatus = useGameStore(selectSaveStatus);
  const debugTools = useGameStore(selectDebugToolsState);
  const patchDebugToolsState = useGameStore((state) => state.patchDebugToolsState);

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
    if (!selectedNpcId || !npcDefinitions.some((npc) => npc.id === selectedNpcId)) {
      setSelectedNpcId(currentArea?.npcIds[0] ?? npcDefinitions[0]?.id ?? null);
    }
  }, [currentArea?.npcIds, npcDefinitions, selectedNpcId]);

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedAreaId) ?? currentArea ?? areas[0] ?? null,
    [areas, currentArea, selectedAreaId],
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
      combatEncounters,
      combatState,
      eventDefinitions,
      eventHistory,
      eventDirector,
      review,
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
      logs,
      mapState,
      npcDefinitions,
      npcStates,
      player,
      playerModel,
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

  const questDebugSnapshot = appQuestDebugController.getDebugSnapshot();
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

  return (
    <PageFrame title={debugText.title} description={debugText.description}>
      <SectionCard
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

      <RenderingPreviewGallery
        preview={preview}
        onPreviewAreaSelect={handlePreviewAreaSelect}
        onOpenForcedScene={handleOpenForcedScene}
        onClearForcedScene={handleClearForcedScene}
      />

      <div className="panel-grid panel-grid--two">
        {debugPanels.map((panel) => (
          <DebugPanel key={panel.title} panel={panel} />
        ))}
        <SectionCard
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
