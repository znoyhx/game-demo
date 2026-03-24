import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  appAreaDebugController,
  appWorldCreationController,
} from '../../app/runtime/appRuntime';
import { RenderingPreviewGallery } from '../../components/debug/RenderingPreviewGallery';
import { DebugPanel } from '../../components/debug/DebugPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { useGameLogStore } from '../../core/logging';
import { debugPanels } from '../../core/mocks/shellContent';
import { resolveAreaEnvironmentState } from '../../core/rules';
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
import { locale } from '../../core/utils/locale';
import { buildRenderingPreviewViewModel } from './renderingPreviewViewModel';

const debugText = locale.pages.debug;

export function DebugPage() {
  const navigate = useNavigate();
  const logs = useGameLogStore((state) => state.entries.slice(0, 8));
  const worldSummary = useGameStore(selectWorldSummary);
  const worldRuntime = useGameStore(selectWorldRuntime);
  const worldFlags = useGameStore(selectWorldFlags);
  const currentArea = useGameStore(selectCurrentArea);
  const areas = useGameStore(selectAreas);
  const mapState = useGameStore(selectMapState);
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

  useEffect(() => {
    if (!selectedAreaId || !areas.some((area) => area.id === selectedAreaId)) {
      setSelectedAreaId(currentArea?.id ?? areas[0]?.id ?? null);
    }
  }, [areas, currentArea?.id, selectedAreaId]);

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

  const handlePreviewControlSelect = useCallback((controlId: string) => {
    setPreviewControlId(controlId);
    setPreviewStatusMessage(`Previewed control "${controlId}" in isolation mode.`);
  }, []);

  const handlePreviewMarkerActivate = useCallback((markerId: string) => {
    setPreviewStatusMessage(`Previewed scene marker "${markerId}" without live progression.`);
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
    setPreviewStatusMessage('Forced scene render cleared. The main game view will use live progression again.');
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
              ? `Jumped to ${selectedArea.name} and opened the live game route.`
              : `Jumped live state to ${selectedArea.name}. You can now test exits and returns without full progression.`,
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
            setAreaDebugStatusMessage(result.reason ?? 'Area access debug update failed.');
            return result;
          }

          setAreaDebugStatusMessage(
            unlocked
              ? `${selectedArea.name} is now unlocked for live route testing.`
              : `${selectedArea.name} has been relocked in runtime state.`,
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
            `Applied flags for ${selectedArea.name}, but the resolved state differed from the requested target.`,
        );
        return result;
      }

      setAreaDebugStatusMessage(
        `Applied ${result.resolvedState?.label ?? selectedEnvironmentStateId} for ${selectedArea.name}.`,
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
