import { useCallback, useMemo, useState } from 'react';

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
  const areas = useGameStore(selectAreas);
  const mapState = useGameStore(selectMapState);
  const debugTools = useGameStore(selectDebugToolsState);
  const patchDebugToolsState = useGameStore((state) => state.patchDebugToolsState);
  const questDefinitions = useGameStore(selectQuestDefinitions);
  const questProgressEntries = useGameStore(selectQuestProgressEntries);
  const npcDefinitions = useGameStore(selectNpcDefinitions);
  const npcStates = useGameStore(selectNpcStates);
  const player = useGameStore(selectPlayerState);
  const playerModel = useGameStore(selectPlayerModelState);
  const combatEncounters = useGameStore(selectCombatEncounters);
  const combatState = useGameStore(selectCombatState);
  const eventDefinitions = useGameStore(selectEventDefinitions);
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
    'Select an NPC, portal, event highlight, or combat marker to drive the demo.',
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
          ? 'Manual save completed. Live progression is synced while forced rendering stays local.'
          : 'Manual save completed. Persistence state is synced.',
      );
      return true;
    });
  }, [isForcedRender, runControlTask]);

  const handleAreaSelect = useCallback(
    async (areaId: string) => {
      if (areaId === effectiveCurrentArea?.id) {
        setStatusMessage(
          isForcedRender
            ? `Already previewing ${effectiveCurrentArea.name}.`
            : `Already in ${effectiveCurrentArea.name}.`,
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
          `Forced render switched to ${nextArea?.name ?? 'the selected area'}. Live progression remains unchanged.`,
        );
        return;
      }

      setBusyAreaId(areaId);

      try {
        await closeDialogue();
        const result = await appAreaNavigationController.enterArea(areaId);

        if (result && 'ok' in result && !result.ok) {
          setStatusMessage(result.reasons[0] ?? 'Area transition failed.');
          return;
        }

        const nextArea = areas.find((area) => area.id === areaId);
        setStatusMessage(`Entered ${nextArea?.name ?? 'the selected area'} and autosaved the route.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to enter the selected area.';
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
        setStatusMessage('That NPC could not be opened right now.');
        return;
      }

      setDialogueState(result);
      setStatusMessage(`Dialogue opened with ${result.npcName}. Use the controls below to branch the conversation.`);
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
        setStatusMessage('That interaction point is unavailable.');
        return;
      }

      if (!marker.enabled) {
        setStatusMessage(`${marker.label} is currently disabled.`);
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
          setStatusMessage(`Encounter started at ${marker.label}. Combat controls are now active.`);
          return;
        }

        setStatusMessage('The encounter could not be started.');
        return;
      }

      if (marker.type === 'event') {
        const eventId = marker.targetId ?? marker.id;
        const result = await runControlTask(`event:${eventId}`, () =>
          appEventTriggerController.triggerEvent(eventId, 'manual'),
        );

        if (result && 'ok' in result && !result.ok) {
          setStatusMessage(result.reasons[0] ?? 'The event did not trigger.');
          return;
        }

        setStatusMessage(`Triggered event node ${marker.label}.`);
        return;
      }

      setStatusMessage(`${marker.label} is highlighted in the scene, but no direct controller action is wired yet.`);
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
        setStatusMessage(result.reasons[0] ?? 'The selected event did not trigger.');
        return;
      }

      setStatusMessage('Dynamic event triggered and logged to the world timeline.');
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
          `Returned to live progression route in ${currentArea?.name ?? 'the current area'}.`,
        );
        return;
      }

      if (controlId === 'refresh-player-model') {
        const result = await runControlTask(controlId, () =>
          appPlayerModelController.refreshPlayerModel(),
        );

        if (result) {
          setStatusMessage('Player model refreshed. Explainability tips now reflect the latest behavior.');
        }

        return;
      }

      if (controlId === 'trigger-director-event') {
        const result = await runControlTask(controlId, () =>
          appEventTriggerController.evaluateDirectorEvent(),
        );

        if (result) {
          setStatusMessage('Game master director evaluated the scene and updated world pressure.');
        } else {
          setStatusMessage('No director event fired from the current state.');
        }

        return;
      }

      if (controlId === 'generate-review') {
        const result = await runControlTask(controlId, () =>
          appReviewGenerationController.generateReview(),
        );

        if (result) {
          setStatusMessage('Review payload generated. Explainability lane refreshed.');
        }

        return;
      }

      if (controlId === 'leave-dialogue') {
        await closeDialogue();
        setStatusMessage('Dialogue closed. Scene controls restored.');
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
          setStatusMessage('Open an NPC conversation before using dialogue controls.');
          return;
        }

        const result = await runControlTask(controlId, () =>
          appNpcInteractionController.chooseDialogueOption(dialogueState.npcId, controlId),
        );

        if (!result) {
          setStatusMessage('Dialogue response unavailable.');
          return;
        }

        setDialogueState({
          npcId: dialogueState.npcId,
          npcName: dialogueState.npcName,
          history: result.history,
        });
        setStatusMessage(`Dialogue advanced with ${dialogueState.npcName}. NPC trust and quest state may have changed.`);
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
          setStatusMessage('Combat round resolved. Check the log feed and explainability tips for tactic changes.');
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
            speaker: action.actor === 'enemy' ? 'Enemy' : action.actor === 'player' ? 'Player' : 'System',
            text: action.description,
          })),
        ) ?? [];

    const dialogueLines = dialogueState?.history.map((line) => ({
      speaker:
        line.speaker === 'npc'
          ? dialogueState.npcName
          : line.speaker === 'player'
            ? 'Player'
            : 'System',
      text: line.text,
    }));

    const controls = combatState
      ? [
          { id: 'attack', label: 'Attack', tone: 'warning' as const },
          { id: 'guard', label: 'Guard', tone: 'info' as const },
          { id: 'heal', label: 'Heal', tone: 'success' as const },
          { id: 'analyze', label: 'Analyze', tone: 'default' as const },
          { id: 'special', label: 'Special', tone: 'warning' as const },
          { id: 'retreat', label: 'Retreat', tone: 'default' as const },
        ]
      : dialogueState
        ? [
            { id: 'greet', label: 'Greet', tone: 'success' as const },
            { id: 'ask', label: 'Ask', tone: 'info' as const },
            { id: 'quest', label: 'Quest', tone: 'warning' as const },
            { id: 'trade', label: 'Trade', tone: 'default' as const },
            { id: 'persuade', label: 'Persuade', tone: 'warning' as const },
            { id: 'leave-dialogue', label: 'Leave', tone: 'default' as const },
          ]
        : [
            ...(isForcedRender
              ? [
                  {
                    id: 'clear-forced-render',
                    label: 'Return to Live Route',
                    tone: 'info' as const,
                  },
                ]
              : []),
            { id: 'manual-save', label: 'Save Game', tone: 'success' as const },
            { id: 'trigger-director-event', label: 'Trigger Director Event', tone: 'warning' as const },
            { id: 'refresh-player-model', label: 'Refresh Profile Insight', tone: 'info' as const },
            { id: 'generate-review', label: 'Generate Review', tone: 'default' as const },
          ];

    return {
      dialogueTitle: combatState
        ? 'Combat Feed'
        : dialogueState
          ? 'Live Conversation'
          : 'Scene Briefing',
      dialogueSpeaker: combatState
        ? `${combatState.enemy.name} · Turn ${combatState.turn}`
        : dialogueState
          ? dialogueState.npcName
          : viewModel.scene.areaName,
      dialogueLines:
        (combatState ? combatLines : dialogueLines)?.slice(-4) ?? [
          {
            speaker: 'System',
            text: viewModel.scene.description,
          },
          {
            speaker: 'Hint',
            text: 'The bottom dock switches between dialogue, combat, and system controls based on the current interaction state.',
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
