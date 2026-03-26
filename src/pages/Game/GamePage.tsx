import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  appAreaNavigationController,
  appCombatController,
  appEventTriggerController,
  appExplorationEncounterController,
  appNpcInteractionController,
  appPlayerModelController,
  appReviewGenerationController,
  appSaveLoadController,
} from '../../app/runtime/appRuntime';
import { GameHud } from '../../components/game/GameHud';
import { resolveGameShellUiSettings } from '../../core/config';
import { selectLogEntries, useGameLogStore } from '../../core/logging';
import type { NpcDialogueSession } from '../../core/schemas';
import {
  selectActivePanel,
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
  selectSaveMetadata,
  selectSaveStatus,
  selectWorldFlags,
  selectWorldRuntime,
  selectWorldSummary,
  useGameStore,
} from '../../core/state';
import { buildForcedRenderMapState } from '../../core/state/renderPreview';
import {
  formatCombatResultLabel,
  formatEnemyTacticLabel,
  formatNpcDispositionLabel,
  formatNpcEmotionalStateLabel,
} from '../../core/utils/displayLabels';
import { resolveGameEventActivationMessage } from './gameEventInteractionMessages';
import { buildGamePageViewModel } from './gameViewModel';

export function GamePage() {
  const worldSummary = useGameStore(selectWorldSummary);
  const worldRuntime = useGameStore(selectWorldRuntime);
  const worldFlags = useGameStore(selectWorldFlags);
  const currentArea = useGameStore(selectCurrentArea);
  const areas = useGameStore(useShallow(selectAreas));
  const mapState = useGameStore(selectMapState);
  const debugTools = useGameStore(selectDebugToolsState);
  const activePanel = useGameStore(selectActivePanel);
  const selectedNpcId = useGameStore((state) => state.ui.selectedNpcId);
  const patchDebugToolsState = useGameStore((state) => state.patchDebugToolsState);
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
  const currentReview = useGameStore(selectCurrentReview);
  const gameConfig = useGameStore(selectGameConfig);
  const saveMetadata = useGameStore(selectSaveMetadata);
  const saveStatus = useGameStore(selectSaveStatus);
  const logEntries = useGameLogStore(selectLogEntries);
  const shellUiSettings = useMemo(
    () => resolveGameShellUiSettings(gameConfig),
    [gameConfig],
  );

  const forcedArea = areas.find((area) => area.id === debugTools.forcedAreaId) ?? null;
  const effectiveCurrentArea = forcedArea ?? currentArea;
  const effectiveMapState = useMemo(
    () => buildForcedRenderMapState(mapState, effectiveCurrentArea?.id ?? null),
    [effectiveCurrentArea?.id, mapState],
  );
  const isForcedRender = forcedArea !== null;
  const activeCombatEncounter = useMemo(
    () =>
      combatEncounters.find((encounter) => encounter.id === combatState?.encounterId) ??
      null,
    [combatEncounters, combatState?.encounterId],
  );
  const isCombatInteractionLocked = combatState !== null && !combatState.result;

  const [dialogueState, setDialogueState] = useState<NpcDialogueSession | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    '已进入当前区域，请在地图、对话与战斗之间选择下一步行动。',
  );
  const [busyControlId, setBusyControlId] = useState<string | null>(null);
  const [busyAreaId, setBusyAreaId] = useState<string | null>(null);

  const viewModel = useMemo(
    () =>
      buildGamePageViewModel({
        worldSummary,
        worldRuntime,
        worldFlags,
        currentArea: effectiveCurrentArea,
        areas,
        mapState: effectiveMapState,
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
        review: currentReview,
        gameConfig,
        saveMetadata,
        saveStatus,
        logEntries,
      }),
    [
      areas,
      combatEncounters,
      combatState,
      currentReview,
      effectiveCurrentArea,
      effectiveMapState,
      eventDefinitions,
      eventDirector,
      eventHistory,
      explorationState,
      gameConfig,
      logEntries,
      npcDefinitions,
      npcStates,
      player,
      playerModel,
      questDefinitions,
      questProgressEntries,
      saveMetadata,
      saveStatus,
      worldFlags,
      worldRuntime,
      worldSummary,
    ],
  );

  useEffect(() => {
    if (activePanel !== 'npc' || !selectedNpcId) {
      setDialogueState(null);
      return;
    }

    const existingDialogue = appNpcInteractionController.getDialogueState(selectedNpcId);
    if (existingDialogue) {
      setDialogueState(existingDialogue);
      return;
    }

    let cancelled = false;

    void appNpcInteractionController.startDialogue(selectedNpcId).then((result) => {
      if (!cancelled && result) {
        setDialogueState(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activePanel, selectedNpcId]);

  const closeDialogue = useCallback(async () => {
    if (!dialogueState) {
      return;
    }

    await appNpcInteractionController.endDialogue(dialogueState.npcId);
    setDialogueState(null);
  }, [dialogueState]);

  const runControlTask = useCallback(async <T,>(controlId: string, task: () => Promise<T>) => {
    setBusyControlId(controlId);

    try {
      return await task();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '当前操作执行失败，请稍后重试。');
      return null;
    } finally {
      setBusyControlId(null);
    }
  }, []);

  const handleManualSave = useCallback(() => {
    void runControlTask('manual-save', async () => {
      await appSaveLoadController.saveNow('manual');
      setStatusMessage(isForcedRender ? '已保存当前调试预览状态。' : '已完成手动存档。');
      return true;
    });
  }, [isForcedRender, runControlTask]);

  const handleAreaSelect = useCallback(
    async (areaId: string) => {
      if (areaId === effectiveCurrentArea?.id) {
        setStatusMessage(`当前已位于 ${effectiveCurrentArea.name}。`);
        return;
      }

      if (isForcedRender) {
        await closeDialogue();
        patchDebugToolsState({
          debugModeEnabled: true,
          forcedAreaId: areaId,
        });
        const nextArea = areas.find((area) => area.id === areaId);
        setStatusMessage(`调试预览已切换到 ${nextArea?.name ?? '目标区域'}。`);
        return;
      }

      setBusyAreaId(areaId);

      try {
        await closeDialogue();
        const result = await appAreaNavigationController.enterArea(areaId);

        if (result && 'ok' in result && !result.ok) {
          setStatusMessage(result.reasons[0] ?? '当前无法进入该区域。');
          return;
        }

        const nextArea = areas.find((area) => area.id === areaId);
        setStatusMessage(`已前往 ${nextArea?.name ?? '目标区域'}。`);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : '区域切换失败。');
      } finally {
        setBusyAreaId(null);
      }
    },
    [areas, closeDialogue, effectiveCurrentArea, isForcedRender, patchDebugToolsState],
  );

  const handleNpcSelect = useCallback(
    async (npcId: string) => {
      await closeDialogue();

      const result = await runControlTask(`npc:${npcId}`, () =>
        appNpcInteractionController.startDialogue(npcId),
      );

      if (!result) {
        setStatusMessage('当前无法开始对话。');
        return;
      }

      setDialogueState(result);
      setStatusMessage(`已与 ${result.npcName} 开始对话。`);
    },
    [closeDialogue, runControlTask],
  );

  const sceneMarkersById = useMemo(
    () => Object.fromEntries(viewModel.scene.stage.markers.map((marker) => [marker.id, marker])),
    [viewModel.scene.stage.markers],
  );
  const sceneEventsById = useMemo(
    () => Object.fromEntries(viewModel.scene.events.map((event) => [event.id, event])),
    [viewModel.scene.events],
  );

  const handleMarkerActivate = useCallback(
    async (markerId: string, activationSource: 'manual' | 'approach' = 'manual') => {
      const marker = sceneMarkersById[markerId];

      if (!marker) {
        setStatusMessage('未找到对应的交互标记。');
        return;
      }

      if (!marker.enabled) {
        setStatusMessage(`${marker.label} 当前不可交互。`);
        return;
      }

      if ((marker.type === 'npc' || marker.type === 'shop') && marker.targetId) {
        await handleNpcSelect(marker.targetId);
        return;
      }

      if (marker.type === 'portal' && marker.targetId) {
        await handleAreaSelect(marker.targetId);
        return;
      }

      if (marker.type === 'item') {
        await closeDialogue();
        const result = await runControlTask(`item:${marker.id}`, () =>
          appExplorationEncounterController.searchInteraction(marker.id),
        );

        if (!result) {
          setStatusMessage(`${marker.label} 搜索失败。`);
          return;
        }

        if (result.searchedAlready) {
          setStatusMessage(`${marker.label} 已被搜索过。`);
          return;
        }

        if (result.resourceGain && result.signals.length > 0) {
          setStatusMessage(
            `${marker.label} 获得了 ${result.resourceGain.label}，并暴露了 ${result.signals.length} 个战斗信号。`,
          );
          return;
        }

        if (result.resourceGain) {
          setStatusMessage(`${marker.label} 获得了 ${result.resourceGain.label}。`);
          return;
        }

        if (result.signals.length > 0) {
          setStatusMessage(`${marker.label} 暴露了 ${result.signals.length} 个战斗信号。`);
          return;
        }

        setStatusMessage(`${marker.label} 没有发现额外线索。`);
        return;
      }

      if (marker.type === 'battle' && marker.targetId) {
        await closeDialogue();
        const activationResult = await runControlTask(`battle:${marker.id}`, () =>
          appExplorationEncounterController.activateSignal(marker.id, {
            autoSave: true,
          }),
        );

        if (activationResult) {
          setStatusMessage(`已确认 ${marker.label}，战斗标记已同步到当前区域。`);
          return;
        }

        const result = await runControlTask(`battle:${marker.targetId}`, () =>
          appCombatController.startEncounter(marker.targetId ?? marker.id),
        );

        if (result) {
          setStatusMessage(`已进入 ${marker.label}，请根据敌方战术选择行动。`);
          return;
        }

        setStatusMessage('战斗入口未能开启。');
        return;
      }

      if (marker.type === 'event') {
        const eventId = marker.targetId ?? marker.id;

        if (isForcedRender) {
          setStatusMessage(
            resolveGameEventActivationMessage({
              isForcedRender: true,
              previewAreaName: effectiveCurrentArea?.name ?? null,
            }),
          );
          return;
        }

        const result = await runControlTask(`event:${eventId}`, () =>
          appEventTriggerController.triggerEvent(
            eventId,
            activationSource === 'approach' ? 'location' : 'manual',
          ),
        );

        if (result && 'ok' in result && !result.ok) {
          setStatusMessage(
            resolveGameEventActivationMessage({
              isForcedRender: false,
              naturalReason: sceneEventsById[eventId]?.naturalReason,
              fallbackReason: result.reasons[0],
            }),
          );
          return;
        }

        setStatusMessage(`已触发 ${marker.label}。`);
        return;
      }

      setStatusMessage(`${marker.label} 目前没有可执行的交互。`);
    },
    [
      closeDialogue,
      effectiveCurrentArea?.name,
      handleAreaSelect,
      handleNpcSelect,
      isForcedRender,
      runControlTask,
      sceneEventsById,
      sceneMarkersById,
    ],
  );

  const handleEventActivate = useCallback(
    async (eventId: string) => {
      if (isForcedRender) {
        setStatusMessage(
          resolveGameEventActivationMessage({
            isForcedRender: true,
            previewAreaName: effectiveCurrentArea?.name ?? null,
          }),
        );
        return;
      }

      const result = await runControlTask(`event:${eventId}`, () =>
        appEventTriggerController.triggerEvent(eventId, 'manual'),
      );

      if (result && 'ok' in result && !result.ok) {
        setStatusMessage(
          resolveGameEventActivationMessage({
            isForcedRender: false,
            naturalReason: sceneEventsById[eventId]?.naturalReason,
            fallbackReason: result.reasons[0],
          }),
        );
        return;
      }

      setStatusMessage('事件已触发。');
    },
    [effectiveCurrentArea?.name, isForcedRender, runControlTask, sceneEventsById],
  );

  const handleControlSelect = useCallback(
    async (controlId: string) => {
      if (controlId === 'manual-save') {
        handleManualSave();
        return;
      }

      if (controlId === 'clear-forced-render') {
        patchDebugToolsState({ forcedAreaId: null });
        setStatusMessage(`已返回 ${currentArea?.name ?? '当前区域'} 的正常渲染。`);
        return;
      }

      if (controlId === 'refresh-player-model') {
        const result = await runControlTask(controlId, () =>
          appPlayerModelController.refreshPlayerModel(),
        );

        if (result) {
          setStatusMessage('玩家模型已刷新。');
        }
        return;
      }

      if (controlId === 'trigger-director-event') {
        const result = await runControlTask(controlId, () =>
          appEventTriggerController.evaluateDirectorEvent(),
        );

        setStatusMessage(result ? '导演事件已评估。' : '当前没有可触发的导演事件。');
        return;
      }

      if (controlId === 'generate-review') {
        const result = await runControlTask(controlId, () =>
          appReviewGenerationController.generateReview(),
        );

        if (result) {
          setStatusMessage('已生成当前回顾。');
        }
        return;
      }

      if (controlId === 'leave-dialogue') {
        await closeDialogue();
        setStatusMessage('已结束当前对话。');
        return;
      }

      if (
        controlId === 'greet' ||
        controlId === 'ask' ||
        controlId === 'trade' ||
        controlId === 'quest' ||
        controlId === 'persuade'
      ) {
        if (!dialogueState) {
          setStatusMessage('当前没有可继续的对话。');
          return;
        }

        const result = await runControlTask(controlId, () =>
          appNpcInteractionController.chooseDialogueOption(dialogueState.npcId, controlId),
        );

        if (!result) {
          setStatusMessage('对话分支执行失败。');
          return;
        }

        setDialogueState({
          npcId: result.npcId,
          npcName: result.npcName,
          history: result.history,
          state: result.state,
          explanation: result.explanation,
        });
        setStatusMessage(`已与 ${result.npcName} 推进新的对话分支。`);
        return;
      }

      if (
        controlId === 'attack' ||
        controlId === 'guard' ||
        controlId === 'heal' ||
        controlId === 'analyze' ||
        controlId === 'special' ||
        controlId === 'retreat'
      ) {
        const result = await runControlTask(controlId, () =>
          appCombatController.submitPlayerAction(controlId),
        );

        if (!result) {
          setStatusMessage('战斗指令未能执行。');
          return;
        }

        if ('ok' in result && !result.ok) {
          setStatusMessage(result.reason ?? '当前战斗指令无法执行。');
          return;
        }

        if (result.result) {
          setStatusMessage(`战斗已结算：${formatCombatResultLabel(result.result)}。已生成战斗回顾。`);
          return;
        }

        setStatusMessage(
          `本回合行动已执行，敌方当前战术为 ${formatEnemyTacticLabel(result.combatState.activeTactic)}，玩家当前能量为 ${result.playerState.energy ?? 0}。`,
        );
      }
    },
    [
      closeDialogue,
      currentArea,
      dialogueState,
      handleManualSave,
      patchDebugToolsState,
      runControlTask,
    ],
  );

  const bottomModel = useMemo(() => {
    const combatLines =
      combatState?.logs
        .slice(-Math.max(1, Math.ceil(shellUiSettings.maxBottomLines / 2)))
        .flatMap((log) =>
          log.actions.map((action) => ({
            speaker:
              action.actor === 'enemy'
                ? '敌方'
                : action.actor === 'player'
                  ? '玩家'
                  : '系统',
            text: action.description,
          })),
        ) ?? [];

    const dialogueLines = dialogueState?.history.map((line) => ({
      speaker:
        line.speaker === 'npc'
          ? dialogueState.npcName
          : line.speaker === 'player'
            ? '玩家'
            : '系统',
      text: line.text,
    }));

    const combatPhaseLabel = combatState
      ? activeCombatEncounter?.bossPhases?.find(
          (phase) => phase.id === combatState.currentPhaseId,
        )?.label ?? '未分阶段'
      : '未分阶段';

    const attitudeSummary = combatState
      ? [
          {
            label: '玩家生命',
            value: `${combatState.player.hp} / ${combatState.player.maxHp}`,
          },
          {
            label: '玩家能量',
            value: `${player.energy ?? 0}`,
          },
          {
            label: '敌方生命',
            value: `${combatState.enemy.hp} / ${combatState.enemy.maxHp}`,
          },
          {
            label: '当前阶段',
            value: combatPhaseLabel,
          },
          {
            label: '当前战术',
            value: formatEnemyTacticLabel(combatState.activeTactic),
          },
          ...(combatState.result
            ? [
                {
                  label: '战斗结果',
                  value: formatCombatResultLabel(combatState.result),
                },
              ]
            : []),
        ]
      : dialogueState
        ? [
            {
              label: '当前态度',
              value:
                dialogueState.explanation?.attitudeLabel ??
                formatNpcDispositionLabel(dialogueState.state.currentDisposition),
            },
            {
              label: '当前情绪',
              value:
                dialogueState.explanation?.emotionalStateLabel ??
                formatNpcEmotionalStateLabel(dialogueState.state.emotionalState),
            },
            {
              label: '信任 / 关系',
              value: `${dialogueState.state.trust} / ${dialogueState.state.relationship}`,
            },
            ...(debugTools.debugModeEnabled && dialogueState.state.memory.shortTerm.length > 0
              ? [
                  {
                    label: '短期记忆',
                    value: dialogueState.state.memory.shortTerm.slice(-1)[0],
                  },
                ]
              : []),
          ]
        : undefined;

    const dialogueTips = dialogueState?.explanation
      ? [
          {
            id: `npc-trust:${dialogueState.npcId}`,
            title: `${dialogueState.npcName} · 信任变化`,
            summary:
              dialogueState.explanation.trust.reasons.length > 0
                ? `${dialogueState.explanation.trust.delta >= 0 ? '+' : ''}${dialogueState.explanation.trust.delta}：${dialogueState.explanation.trust.reasons.join('；')}`
                : `${dialogueState.explanation.trust.delta >= 0 ? '+' : ''}${dialogueState.explanation.trust.delta}`,
            tone:
              dialogueState.explanation.trust.delta >= 0
                ? ('success' as const)
                : ('warning' as const),
          },
          {
            id: `npc-relationship:${dialogueState.npcId}`,
            title: `${dialogueState.npcName} · 关系变化`,
            summary:
              dialogueState.explanation.relationship.reasons.length > 0
                ? `${dialogueState.explanation.relationship.delta >= 0 ? '+' : ''}${dialogueState.explanation.relationship.delta}：${dialogueState.explanation.relationship.reasons.join('；')}`
                : `${dialogueState.explanation.relationship.delta >= 0 ? '+' : ''}${dialogueState.explanation.relationship.delta}`,
            tone:
              dialogueState.explanation.relationship.delta >= 0
                ? ('success' as const)
                : ('warning' as const),
          },
          ...(debugTools.debugModeEnabled && dialogueState.explanation.decisionBasis.length > 0
            ? [
                {
                  id: `npc-debug:${dialogueState.npcId}`,
                  title: '对话决策依据',
                  summary: dialogueState.explanation.decisionBasis.join('；'),
                  tone: 'info' as const,
                },
              ]
            : []),
        ]
      : [];

    const controls = combatState && !combatState.result
      ? [
          { id: 'attack', label: '攻击', tone: 'warning' as const },
          { id: 'guard', label: '防御', tone: 'info' as const },
          { id: 'heal', label: '治疗', tone: 'success' as const },
          { id: 'analyze', label: '分析', tone: 'default' as const },
          { id: 'special', label: '技能', tone: 'warning' as const },
          { id: 'retreat', label: '撤退', tone: 'default' as const },
        ]
      : dialogueState
        ? [
            { id: 'greet', label: '问候', tone: 'success' as const },
            { id: 'ask', label: '询问', tone: 'info' as const },
            { id: 'quest', label: '任务', tone: 'warning' as const },
            { id: 'trade', label: '交易', tone: 'default' as const },
            { id: 'persuade', label: '说服', tone: 'warning' as const },
            { id: 'leave-dialogue', label: '离开对话', tone: 'default' as const },
          ]
        : [
            ...(isForcedRender
              ? [
                  {
                    id: 'clear-forced-render',
                    label: '退出区域预览',
                    tone: 'info' as const,
                  },
                ]
              : []),
            { id: 'manual-save', label: '手动存档', tone: 'success' as const },
            { id: 'trigger-director-event', label: '评估导演事件', tone: 'warning' as const },
            { id: 'refresh-player-model', label: '刷新玩家模型', tone: 'info' as const },
            { id: 'generate-review', label: '生成回顾', tone: 'default' as const },
          ];

    return {
      dialogueTitle: combatState
        ? combatState.result
          ? '战斗结算'
          : '战斗指挥'
        : dialogueState
          ? '当前对话'
          : '区域概览',
      dialogueSpeaker: combatState
        ? `${combatState.enemy.name} · 第 ${combatState.turn} 回合`
        : dialogueState
          ? dialogueState.npcName
          : viewModel.scene.areaName,
      dialogueLines:
        (combatState ? combatLines : dialogueLines)?.slice(
          -shellUiSettings.maxBottomLines,
        ) ?? [
          {
            speaker: '系统',
            text: viewModel.scene.description,
          },
          {
            speaker: '提示',
            text: '可从地图标记、右侧事件与底部指令进入下一步流程。',
          },
        ],
      controls,
      logs: viewModel.logs,
      tips: [...dialogueTips, ...viewModel.tips].slice(0, shellUiSettings.maxTips),
      statusMessage,
      activeControlId: busyControlId,
      attitudeSummary,
    };
  }, [
    activeCombatEncounter,
    busyControlId,
    combatState,
    debugTools.debugModeEnabled,
    dialogueState,
    isForcedRender,
    player.energy,
    shellUiSettings.maxBottomLines,
    shellUiSettings.maxTips,
    statusMessage,
    viewModel.logs,
    viewModel.scene.areaName,
    viewModel.scene.description,
    viewModel.tips,
  ]);

  const handleHudAreaSelect = useCallback(
    (areaId: string) => {
      void handleAreaSelect(areaId);
    },
    [handleAreaSelect],
  );

  const handleHudNpcSelect = useCallback(
    (npcId: string) => {
      void handleNpcSelect(npcId);
    },
    [handleNpcSelect],
  );

  const handleHudMarkerActivate = useCallback(
    (markerId: string, source?: 'manual' | 'approach') => {
      void handleMarkerActivate(markerId, source ?? 'manual');
    },
    [handleMarkerActivate],
  );

  const handleHudEventActivate = useCallback(
    (eventId: string) => {
      void handleEventActivate(eventId);
    },
    [handleEventActivate],
  );

  const handleHudControlSelect = useCallback(
    (controlId: string) => {
      void handleControlSelect(controlId);
    },
    [handleControlSelect],
  );

  return (
    <GameHud
      topBar={{
        ...viewModel.topBar,
        isSaving: busyControlId === 'manual-save' || saveStatus === 'saving',
      }}
      leftSidebar={viewModel.leftSidebar}
      scene={{
        ...viewModel.scene,
        interactionLocked: dialogueState !== null || isCombatInteractionLocked,
      }}
      rightSidebar={viewModel.rightSidebar}
      bottom={bottomModel}
      busyAreaId={busyAreaId}
      onManualSave={handleManualSave}
      onAreaSelect={handleHudAreaSelect}
      onNpcSelect={handleHudNpcSelect}
      onMarkerActivate={handleHudMarkerActivate}
      onEventActivate={handleHudEventActivate}
      onControlSelect={handleHudControlSelect}
    />
  );
}
