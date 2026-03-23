import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { appWorldCreationController } from '../../app/runtime/appRuntime';
import { DebugPanel } from '../../components/debug/DebugPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { useGameLogStore } from '../../core/logging';
import { debugPanels } from '../../core/mocks/shellContent';

export function DebugPage() {
  const navigate = useNavigate();
  const logs = useGameLogStore((state) => state.entries.slice(0, 8));
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const launchScenario = async (task: () => Promise<unknown>) => {
    setIsLaunching(true);
    setErrorMessage(null);

    try {
      await task();
      navigate('/game');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Debug scenario launch failed before the world could be prepared.',
      );
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <PageFrame
      title="Debug Launchpad"
      description="Launch template, quick-play, and dev/test scenarios through the same normalized creation pipeline, then inspect runtime state and logs without replaying the full setup flow."
    >
      <SectionCard
        title="Scenario Shortcuts"
        eyebrow="Fast Path"
        description="These shortcuts bypass the full creation form, run the normalized world creation pipeline, create the opening save, and route directly into the game scene."
        footer="Use these entries to validate generated, template-based, and debug world starts without repeating the full setup flow."
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
            Load Template Demo
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={isLaunching}
            type="button"
            onClick={() =>
              void launchScenario(() => appWorldCreationController.createQuickPlayWorld())
            }
          >
            Quick Play Shortcut
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={isLaunching}
            type="button"
            onClick={() =>
              void launchScenario(() => appWorldCreationController.createDevTestWorld())
            }
          >
            Dev/Test Shortcut
          </button>
        </div>
      </SectionCard>

      {errorMessage ? (
        <section className="startup-status-card startup-status-card--error">
          <Badge tone="warning">Debug Launch Error</Badge>
          <p className="startup-status-card__body">{errorMessage}</p>
        </section>
      ) : null}

      <div className="panel-grid panel-grid--two">
        {debugPanels.map((panel) => (
          <DebugPanel key={panel.title} panel={panel} />
        ))}
        <SectionCard
          title="Runtime Logs"
          eyebrow={`${logs.length} entries`}
          description="Typed runtime logs are available here for debug inspection."
          footer="This feed is sourced from the lightweight log store, not ad hoc console output."
        >
          <ul className="section-card__list">
            {logs.length === 0 ? (
              <li>No logs recorded yet.</li>
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
