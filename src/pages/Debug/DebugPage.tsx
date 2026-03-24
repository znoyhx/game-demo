import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { appWorldCreationController } from '../../app/runtime/appRuntime';
import { RenderingPreviewGallery } from '../../components/debug/RenderingPreviewGallery';
import { DebugPanel } from '../../components/debug/DebugPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { useGameLogStore } from '../../core/logging';
import { debugPanels } from '../../core/mocks/shellContent';
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

  const source = useMemo(
    () => ({
      worldSummary,
      worldRuntime,
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
