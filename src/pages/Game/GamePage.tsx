import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  appAreaNavigationController,
  appCombatController,
  appEventTriggerController,
  appNpcInteractionController,
  appPlayerModelController,
  appReviewGenerationController,
  appSaveLoadController,
} from '../../app/runtime/appRuntime';
import { GameHud } from '../../components/game/GameHud';
import { selectLogEntries, useGameLogStore } from '../../core/logging';
import type { NpcDialogueTurn } from '../../core/schemas';
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
import { buildForcedRenderMapState } from '../../core/state/renderPreview';
import { buildGamePageViewModel } from './gameViewModel';

export function GamePage() {
  const worldSummary = useGameStore(selectWorldSummary);
  const worldRuntime = useGameStore(selectWorldRuntime);
  const worldFlags = useGameStore(selectWorldFlags);
  const currentArea = useGameStore(selectCurrentArea);
  const areas = useGameStore(useShallow(selectAreas));
  const mapState = useGameStore(selectMapState);
  const debugTools = useGameStore(selectDebugToolsState);
  const patchDebugToolsState = useGameStore((state) => state.patchDebugToolsState);
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
  const currentReview = useGameStore(selectCurrentReview);
  const saveMetadata = useGameStore(selectSaveMetadata);
  const saveStatus = useGameStore(selectSaveStatus);
  const logEntries = useGameLogStore(selectLogEntries);
  const forcedArea = areas.find((area) => area.id === debugTools.forcedAreaId) ?? null;
  const effectiveCurrentArea = forcedArea ?? currentArea;
  const effectiveMapState = useMemo(
    () => buildForcedRenderMapState(mapState, effectiveCurrentArea?.id ?? null),
    [effectiveCurrentArea?.id, mapState],
  );
  const isForcedRender = forcedArea !== null;

  const [dialogueState, setDialogueState] = useState<{
    npcId: string;
    npcName: string;
    history: NpcDialogueTurn[];
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    '请选择角色、传送门、事件高亮或战斗标记，开始当前演示。',
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
        combatEncounters,
        combatState,
        eventDefinitions,
        eventHistory,
        eventDirector,
        review: currentReview,
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
      logEntries,
      npcDefinitions,
      npcStates,
      player,
      playerModel,
      questDefinitions,
      questProgressEntries,
      saveMetadata,
      saveStatus,
      worldRuntime,
      worldFlags,
      worldSummary,
    ],
  );

  const closeDialogue = useCallback(async () => {
    if (!dialogueState) {
      return;
    }

    await appNpcInteractionController.endDialogue(dialogueState.npcId);
    setDialogueState(null);
  }, [dialogueState]);

  const runControlTask = useCallback(
    async <T,>(controlId: string, task: () => Promise<T>) => {
      setBusyControlId(controlId);

      try {
        return await task();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected game action failure.';
        setStatusMessage(message);
        return null;
      } finally {
        setBusyControlId(null);
      }
    },
    [],
  );

  const handleManualSave = useCallback(() => {
    void runControlTask('manual-save', async () => {
      await appSaveLoadController.saveNow('manual');
      setStatusMessage(
        isForcedRender
          ? '已手动保存。正式进度已同步，强制渲染仍保持本地预览。'
          : '已手动保存。持久化状态已完成同步。',
      );
      return true;
    });
  }, [isForcedRender, runControlTask]);

  const handleAreaSelect = useCallback(
    async (areaId: string) => {
        if (areaId === effectiveCurrentArea?.id) {
          setStatusMessage(
            isForcedRender
              ? `当前已经在预览 ${effectiveCurrentArea.name}。`
              : `当前已经位于 ${effectiveCurrentArea.name}。`,
          );
          return;
        }

      if (isForcedRender) {
        await closeDialogue();
        patchDebugToolsState({
          debugModeEnabled: true,
          forcedAreaId: areaId,
        });
        const nextArea = areas.find((area) => area.id === areaId);
        setStatusMessage(
          `强制渲染已切换到 ${nextArea?.name ?? '所选区域'}，正式进度保持不变。`,
        );
        return;
      }

      setBusyAreaId(areaId);

      try {
        await closeDialogue();
        const result = await appAreaNavigationController.enterArea(areaId);

        if (result && 'ok' in result && !result.ok) {
          setStatusMessage(result.reasons[0] ?? '区域切换失败。');
          return;
        }

        const nextArea = areas.find((area) => area.id === areaId);
        setStatusMessage(`已进入 ${nextArea?.name ?? '所选区域'}，并自动保存了路线状态。`);
      } catch (error) {
        const message = error instanceof Error ? error.message : '无法进入所选区域。';
        setStatusMessage(message);
      } finally {
        setBusyAreaId(null);
      }
    },
    [
      areas,
      closeDialogue,
      effectiveCurrentArea,
      isForcedRender,
      patchDebugToolsState,
    ],
  );

  const handleNpcSelect = useCallback(
    async (npcId: string) => {
      await closeDialogue();

      const result = await runControlTask(`npc:${npcId}`, () =>
        appNpcInteractionController.startDialogue(npcId),
      );

      if (!result) {
        setStatusMessage('当前无法打开该角色对话。');
        return;
      }

      setDialogueState(result);
      setStatusMessage(`已与 ${result.npcName} 开启对话，可使用下方控制项推进分支。`);
    },
    [closeDialogue, runControlTask],
  );

  const sceneMarkersById = useMemo(
    () =>
      Object.fromEntries(
        viewModel.scene.stage.markers.map((marker) => [marker.id, marker]),
      ),
    [viewModel.scene.stage.markers],
  );

  const handleMarkerActivate = useCallback(
    async (markerId: string) => {
      const marker = sceneMarkersById[markerId];

      if (!marker) {
        setStatusMessage('该交互点当前不可用。');
        return;
      }

      if (!marker.enabled) {
        setStatusMessage(`${marker.label} 当前不可用。`);
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

      if (marker.type === 'battle' && marker.targetId) {
        await closeDialogue();
        const result = await runControlTask(`battle:${marker.targetId}`, () =>
          appCombatController.startEncounter(marker.targetId ?? marker.id),
        );

        if (result) {
          setStatusMessage(`已在 ${marker.label} 开启遭遇战，战斗控制现已激活。`);
          return;
        }

        setStatusMessage('该遭遇战无法启动。');
        return;
      }

      if (marker.type === 'event') {
        const eventId = marker.targetId ?? marker.id;
        const result = await runControlTask(`event:${eventId}`, () =>
          appEventTriggerController.triggerEvent(eventId, 'manual'),
        );

        if (result && 'ok' in result && !result.ok) {
          setStatusMessage(result.reasons[0] ?? '事件未能触发。');
          return;
        }

        setStatusMessage(`已触发事件节点：${marker.label}。`);
        return;
      }

      setStatusMessage(`${marker.label} 已在场景中高亮，但暂未接入直接控制动作。`);
    },
    [
      closeDialogue,
      handleAreaSelect,
      handleNpcSelect,
      runControlTask,
      sceneMarkersById,
    ],
  );

  const handleEventActivate = useCallback(
    async (eventId: string) => {
      const result = await runControlTask(`event:${eventId}`, () =>
        appEventTriggerController.triggerEvent(eventId, 'manual'),
      );

      if (result && 'ok' in result && !result.ok) {
        setStatusMessage(result.reasons[0] ?? '所选事件未能触发。');
        return;
      }

      setStatusMessage('动态事件已触发，并写入世界时间线。');
    },
    [runControlTask],
  );

  const handleControlSelect = useCallback(
    async (controlId: string) => {
      if (controlId === 'manual-save') {
        handleManualSave();
        return;
      }

      if (controlId === 'clear-forced-render') {
        patchDebugToolsState({ forcedAreaId: null });
        setStatusMessage(
          `已回到 ${currentArea?.name ?? '当前区域'} 的正式进度路线。`,
        );
        return;
      }

      if (controlId === 'refresh-player-model') {
        const result = await runControlTask(controlId, () =>
          appPlayerModelController.refreshPlayerModel(),
        );

        if (result) {
          setStatusMessage('玩家模型已刷新，可解释提示已同步最新行为。');
        }

        return;
      }

      if (controlId === 'trigger-director-event') {
        const result = await runControlTask(controlId, () =>
          appEventTriggerController.evaluateDirectorEvent(),
        );

        if (result) {
          setStatusMessage('游戏主持已评估当前场景，并更新世界压力。');
        } else {
          setStatusMessage('当前状态下没有新的主持事件被触发。');
        }

        return;
      }

      if (controlId === 'generate-review') {
        const result = await runControlTask(controlId, () =>
          appReviewGenerationController.generateReview(),
        );

        if (result) {
          setStatusMessage('回顾载荷已生成，可解释信息已刷新。');
        }

        return;
      }

      if (controlId === 'leave-dialogue') {
        await closeDialogue();
        setStatusMessage('对话已关闭，场景控制已恢复。');
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
          setStatusMessage('请先开启一段角色对话，再使用对话控制。');
          return;
        }

        const result = await runControlTask(controlId, () =>
          appNpcInteractionController.chooseDialogueOption(dialogueState.npcId, controlId),
        );

        if (!result) {
          setStatusMessage('当前没有可用的对话回应。');
          return;
        }

        setDialogueState({
          npcId: dialogueState.npcId,
          npcName: dialogueState.npcName,
          history: result.history,
        });
        setStatusMessage(`已推进与 ${dialogueState.npcName} 的对话，信任与任务状态可能已经变化。`);
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

        if (result) {
          setStatusMessage('本回合战斗已结算，请查看日志与可解释提示了解战术变化。');
        }
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
        .slice(-2)
        .flatMap((log) =>
          log.actions.map((action) => ({
            speaker:
              action.actor === 'enemy' ? '敌方' : action.actor === 'player' ? '玩家' : '系统',
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

    const controls = combatState
      ? [
          { id: 'attack', label: '攻击', tone: 'warning' as const },
          { id: 'guard', label: '防御', tone: 'info' as const },
          { id: 'heal', label: '治疗', tone: 'success' as const },
          { id: 'analyze', label: '解析', tone: 'default' as const },
          { id: 'special', label: '特技', tone: 'warning' as const },
          { id: 'retreat', label: '撤退', tone: 'default' as const },
        ]
      : dialogueState
        ? [
            { id: 'greet', label: '问候', tone: 'success' as const },
            { id: 'ask', label: '询问', tone: 'info' as const },
            { id: 'quest', label: '任务', tone: 'warning' as const },
            { id: 'trade', label: '交易', tone: 'default' as const },
            { id: 'persuade', label: '说服', tone: 'warning' as const },
            { id: 'leave-dialogue', label: '离开', tone: 'default' as const },
          ]
        : [
            ...(isForcedRender
              ? [
                  {
                    id: 'clear-forced-render',
                    label: '回到正式路线',
                    tone: 'info' as const,
                  },
                ]
              : []),
            { id: 'manual-save', label: '保存游戏', tone: 'success' as const },
            { id: 'trigger-director-event', label: '触发主持事件', tone: 'warning' as const },
            { id: 'refresh-player-model', label: '刷新玩家画像', tone: 'info' as const },
            { id: 'generate-review', label: '生成回顾', tone: 'default' as const },
          ];

    return {
      dialogueTitle: combatState
        ? '战斗播报'
        : dialogueState
          ? '实时对话'
          : '场景简报',
      dialogueSpeaker: combatState
        ? `${combatState.enemy.name} · 第 ${combatState.turn} 回合`
        : dialogueState
          ? dialogueState.npcName
          : viewModel.scene.areaName,
      dialogueLines:
        (combatState ? combatLines : dialogueLines)?.slice(-4) ?? [
          {
            speaker: '系统',
            text: viewModel.scene.description,
          },
          {
            speaker: '提示',
            text: '底部停靠栏会根据当前互动状态，在对话、战斗与系统控制之间自动切换。',
          },
        ],
      controls,
      logs: viewModel.logs,
      tips: viewModel.tips,
      statusMessage,
      activeControlId: busyControlId,
    };
  }, [
    busyControlId,
    combatState,
    dialogueState,
    isForcedRender,
    statusMessage,
    viewModel.logs,
    viewModel.scene.areaName,
    viewModel.scene.description,
    viewModel.tips,
  ]);

  return (
    <GameHud
      topBar={{
        ...viewModel.topBar,
        isSaving: busyControlId === 'manual-save' || saveStatus === 'saving',
      }}
      leftSidebar={viewModel.leftSidebar}
      scene={viewModel.scene}
      rightSidebar={viewModel.rightSidebar}
      bottom={bottomModel}
      busyAreaId={busyAreaId}
      onManualSave={handleManualSave}
      onAreaSelect={(areaId) => {
        void handleAreaSelect(areaId);
      }}
      onNpcSelect={(npcId) => {
        void handleNpcSelect(npcId);
      }}
      onMarkerActivate={(markerId) => {
        void handleMarkerActivate(markerId);
      }}
      onEventActivate={(eventId) => {
        void handleEventActivate(eventId);
      }}
      onControlSelect={(controlId) => {
        void handleControlSelect(controlId);
      }}
    />
  );
}
