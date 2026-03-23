import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { appWorldCreationController } from '../../app/runtime/appRuntime';
import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import {
  defaultWorldCreationRequest,
  mockNpcDefinitions,
  worldCreationTemplates,
} from '../../core/mocks';
import {
  selectRecoveryNotice,
  selectSaveMetadata,
  selectStartupSource,
  selectWorldSummary,
  useGameStore,
} from '../../core/state';
import type { WorldCreationRequest } from '../../core/schemas';

const toTitleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');

const pickFocusWord = (value: string) =>
  toTitleCase(value).split(' ').find(Boolean) ?? 'Forge';

const toSentenceCase = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`;
};

const buildDraftPreview = (request: WorldCreationRequest) => {
  const focusWord = pickFocusWord(request.theme);
  const worldName = `${focusWord} Reach`;

  return {
    worldName,
    regions: [`${focusWord} Crossroads`, `${focusWord} Archive`, `${focusWord} Sanctum`],
    factions: [`${focusWord} Wardens`, `${focusWord} Court`],
    mainQuestSeed: toSentenceCase(request.gameGoal),
    resourceSetup: `${toTitleCase(request.worldStyle)} tileset, layered regional backdrops, and a boss-route score`,
    storyPremise: `${worldName} is a ${request.worldStyle} realm where you must ${request.gameGoal.trim()} before the final wardline collapses.`,
  };
};

export function HomePage() {
  const navigate = useNavigate();
  const worldSummary = useGameStore(selectWorldSummary);
  const saveMetadata = useGameStore(selectSaveMetadata);
  const startupSource = useGameStore(selectStartupSource);
  const recoveryNotice = useGameStore(selectRecoveryNotice);
  const [draft, setDraft] = useState<WorldCreationRequest>(defaultWorldCreationRequest);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const preview = buildDraftPreview(draft);

  const runControllerTask = async (task: () => Promise<unknown>) => {
    setIsCreating(true);
    setErrorMessage(null);

    try {
      await task();
      navigate('/game');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'World creation failed before a valid fallback could be prepared.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const runCreation = async (request: WorldCreationRequest) =>
    runControllerTask(() => appWorldCreationController.createWorld(request));

  return (
    <PageFrame
      title="World Creation Module"
      description="Create a new PixelForge Agent run in under a minute with presets, one-click defaults, quick play, and a dev/test world seed backed by schema-validated mock agents."
    >
      <section className="hero-callout">
        <div className="hero-callout__header">
          <div>
            <p className="hero-callout__kicker">Current World</p>
            <h3 className="hero-callout__title">{worldSummary.name}</h3>
          </div>
          <div className="hero-callout__badges">
            <Badge tone={startupSource === 'save' ? 'success' : 'warning'}>
              {startupSource === 'save' ? 'Continue Ready' : 'Mock Seed Active'}
            </Badge>
            <Badge tone="info">{saveMetadata.label ?? saveMetadata.slot ?? saveMetadata.id}</Badge>
          </div>
        </div>
        <p>
          Resume the latest world immediately, or forge a new one through the World
          Architect, Quest Designer, and Level Builder mock pipeline.
        </p>
        <div className="hero-callout__actions">
          <Link className="pixel-button" to="/game">
            Continue Current World
          </Link>
          <Link className="pixel-button pixel-button--ghost" to="/debug">
            Open Debug Route
          </Link>
          <button
            className="pixel-button pixel-button--ghost"
            disabled={isCreating}
            type="button"
            onClick={() => void runControllerTask(() => appWorldCreationController.createDefaultWorld())}
          >
            Generate Default World
          </button>
        </div>
      </section>

      {recoveryNotice ? (
        <section className="startup-status-card">
          <Badge tone="warning">Fallback Notice</Badge>
          <p className="startup-status-card__body">{recoveryNotice}</p>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="startup-status-card startup-status-card--error">
          <Badge tone="warning">Creation Error</Badge>
          <p className="startup-status-card__body">{errorMessage}</p>
        </section>
      ) : null}

      <div className="panel-grid panel-grid--two">
        <SectionCard
          title="Preset Templates"
          eyebrow="Start Fast"
          description="Apply a tuned configuration first, then adjust the fields below if needed."
          footer="Each preset stays within the PRD input contract and seeds a full opening world."
        >
          <div className="creation-template-list">
            {worldCreationTemplates.map((template) => (
              <button
                key={template.id}
                className="creation-template-card"
                disabled={isCreating}
                type="button"
                onClick={() => setDraft(template.request)}
              >
                <span className="creation-template-card__title">{template.label}</span>
                <span className="creation-template-card__description">
                  {template.description}
                </span>
                <span className="creation-template-card__meta">
                  {template.featuredOutputs.regions} regions / {template.featuredOutputs.factions}{' '}
                  factions / {template.featuredOutputs.npcs} NPCs
                </span>
              </button>
            ))}
          </div>
          <div className="creation-quick-actions">
            <button
              className="pixel-button"
              disabled={isCreating}
              type="button"
              onClick={() => void runControllerTask(() => appWorldCreationController.createQuickPlayWorld())}
            >
              Quick Play Mode
            </button>
            <button
              className="pixel-button pixel-button--ghost"
              disabled={isCreating}
              type="button"
              onClick={() => void runControllerTask(() => appWorldCreationController.createDevTestWorld())}
            >
              Dev/Test Mode
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Prepared Outputs"
          eyebrow="Preview"
          description="The creation controller will prepare these assets before hydrating state and saving the opening snapshot."
          footer="Outputs are finalized by the mock agent pipeline and validated again at save-snapshot boundaries."
        >
          <dl className="creation-preview-list">
            <div>
              <dt>World Name</dt>
              <dd>{preview.worldName}</dd>
            </div>
            <div>
              <dt>Map Regions</dt>
              <dd>{preview.regions.join(' / ')}</dd>
            </div>
            <div>
              <dt>Core Factions</dt>
              <dd>{preview.factions.join(' / ')}</dd>
            </div>
            <div>
              <dt>Main Quest Seed</dt>
              <dd>{preview.mainQuestSeed}</dd>
            </div>
            <div>
              <dt>Initial NPC Set</dt>
              <dd>{mockNpcDefinitions.map((npc) => npc.name).join(', ')}</dd>
            </div>
            <div>
              <dt>Initial Resource Setup</dt>
              <dd>{preview.resourceSetup}</dd>
            </div>
            <div>
              <dt>Initial Story Premise</dt>
              <dd>{preview.storyPremise}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="Forge a Custom World"
        eyebrow="Input Contract"
        description="All required PRD inputs are captured here and passed into the world-creation pipeline."
        footer="The creation controller handles schema validation, snapshot hydration, persistence, and fallback generation."
      >
        <form
          className="world-creation-form"
          onSubmit={(event) => {
            event.preventDefault();
            void runCreation(draft);
          }}
        >
          <label className="world-creation-form__field">
            <span>Game Theme</span>
            <input
              disabled={isCreating}
              name="theme"
              required
              type="text"
              value={draft.theme}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  theme: event.target.value,
                }))
              }
            />
          </label>

          <label className="world-creation-form__field">
            <span>World Style</span>
            <input
              disabled={isCreating}
              name="worldStyle"
              required
              type="text"
              value={draft.worldStyle}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  worldStyle: event.target.value,
                }))
              }
            />
          </label>

          <label className="world-creation-form__field">
            <span>Difficulty</span>
            <select
              disabled={isCreating}
              name="difficulty"
              value={draft.difficulty}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  difficulty: event.target.value as WorldCreationRequest['difficulty'],
                }))
              }
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="world-creation-form__field world-creation-form__field--wide">
            <span>Game Goal</span>
            <input
              disabled={isCreating}
              name="gameGoal"
              required
              type="text"
              value={draft.gameGoal}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  gameGoal: event.target.value,
                }))
              }
            />
          </label>

          <label className="world-creation-form__field world-creation-form__field--wide">
            <span>Learning Goal (Optional)</span>
            <input
              disabled={isCreating}
              name="learningGoal"
              type="text"
              value={draft.learningGoal ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  learningGoal: event.target.value || undefined,
                }))
              }
            />
          </label>

          <fieldset className="world-creation-form__field world-creation-form__field--wide">
            <legend>Preference</legend>
            <div className="world-creation-form__radio-group">
              {(['story', 'exploration', 'combat', 'hybrid'] as const).map((mode) => (
                <label key={mode} className="world-creation-form__radio">
                  <input
                    checked={draft.preferredMode === mode}
                    disabled={isCreating}
                    name="preferredMode"
                    type="radio"
                    value={mode}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        preferredMode: mode,
                      }))
                    }
                  />
                  <span>{toTitleCase(mode)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="world-creation-form__toggles">
            <label className="world-creation-form__toggle">
              <input
                checked={draft.quickStartEnabled}
                disabled={isCreating}
                type="checkbox"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    quickStartEnabled: event.target.checked,
                  }))
                }
              />
              <span>Quick Play Mode</span>
            </label>

            <label className="world-creation-form__toggle">
              <input
                checked={draft.devModeEnabled}
                disabled={isCreating}
                type="checkbox"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    devModeEnabled: event.target.checked,
                  }))
                }
              />
              <span>Dev/Test Mode</span>
            </label>
          </div>

          <div className="hero-callout__actions">
            <button className="pixel-button" disabled={isCreating} type="submit">
              {isCreating ? 'Forging World...' : 'Forge Custom World'}
            </button>
            <button
              className="pixel-button pixel-button--ghost"
              disabled={isCreating}
              type="button"
              onClick={() => setDraft(defaultWorldCreationRequest)}
            >
              Reset to Default
            </button>
          </div>
        </form>
      </SectionCard>
    </PageFrame>
  );
}
