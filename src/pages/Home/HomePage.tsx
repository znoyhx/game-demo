import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { appWorldCreationController } from '../../app/runtime/appRuntime';
import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { PixelTabs } from '../../components/pixel-ui/PixelTabs';
import {
  defaultWorldCreationRequest,
  mockNpcDefinitions,
  worldCreationTemplates,
} from '../../core/mocks';
import type { WorldCreationRequest } from '../../core/schemas';
import {
  selectCurrentArea,
  selectRecoveryNotice,
  selectSaveMetadata,
  selectStartupSource,
  selectWorldSummary,
  useGameStore,
  useShellStore,
} from '../../core/state';
import { locale } from '../../core/utils/locale';

const homeText = locale.pages.home;
const preferredModeLabels = locale.labels.preferredModes;

const toTitleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');

const pickFocusWord = (value: string) =>
  toTitleCase(value).split(' ').find(Boolean) ?? '锻炉';

const toSentenceCase = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`;
};

const buildDraftPreview = (request: WorldCreationRequest) => {
  const focusWord = pickFocusWord(request.theme);
  const worldName = homeText.preview.worldName(focusWord);

  return {
    worldName,
    regions: homeText.preview.regions(focusWord),
    factions: homeText.preview.factions(focusWord),
    mainQuestSeed: toSentenceCase(request.gameGoal),
    resourceSetup: homeText.preview.resourceSetup(toTitleCase(request.worldStyle)),
    storyPremise: homeText.preview.storyPremise(
      worldName,
      request.worldStyle,
      request.gameGoal.trim(),
    ),
  };
};

export function HomePage() {
  const navigate = useNavigate();
  const developerToolsVisible = useShellStore((state) => state.developerToolsVisible);
  const worldSummary = useGameStore(selectWorldSummary);
  const currentArea = useGameStore(selectCurrentArea);
  const saveMetadata = useGameStore(selectSaveMetadata);
  const startupSource = useGameStore(selectStartupSource);
  const recoveryNotice = useGameStore(selectRecoveryNotice);
  const [draft, setDraft] = useState<WorldCreationRequest>(defaultWorldCreationRequest);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const preview = buildDraftPreview(draft);
  const worldReadyFromSave = startupSource === 'save';
  const worldReadyFromCreation = startupSource === 'generated';

  const runControllerTask = async (task: () => Promise<unknown>) => {
    setIsCreating(true);
    setErrorMessage(null);

    try {
      await task();
      navigate('/game');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : homeText.unknownCreationError);
    } finally {
      setIsCreating(false);
    }
  };

  const runCreation = async (request: WorldCreationRequest) =>
    runControllerTask(() => appWorldCreationController.createWorld(request));

  const homeSections = [
    { id: 'start', label: '快速启程', href: '#home-start', isActive: true },
    { id: 'preview', label: '模板预览', href: '#home-preview' },
    { id: 'create', label: '自定义世界', href: '#home-create' },
  ];

  return (
    <PageFrame
      eyebrow={homeText.currentWorld.kicker}
      title={homeText.title}
      description={homeText.description}
      className="page-frame--home"
      navigation={<PixelTabs items={homeSections} label="首页分区导航" />}
      actions={
        <div className="page-frame__badge-row">
          <Badge tone={worldReadyFromSave || worldReadyFromCreation ? 'success' : 'warning'}>
            {worldReadyFromSave
              ? homeText.currentWorld.continueBadge
              : worldReadyFromCreation
                ? homeText.currentWorld.generatedWorldBadge
                : homeText.currentWorld.sampleWorldBadge}
          </Badge>
          <Badge tone="info">{saveMetadata.label ?? saveMetadata.slot ?? saveMetadata.id}</Badge>
        </div>
      }
    >
      <section className="hero-callout home-hero" id="home-start">
        <div className="hero-callout__header">
          <div>
            <p className="hero-callout__kicker">{homeText.currentWorld.kicker}</p>
            <h3 className="hero-callout__title">{worldSummary.name}</h3>
            <p className="home-hero__detail">
              {currentArea
                ? `当前主舞台位于 ${currentArea.name}，可以直接进入游戏继续探索。`
                : '当前世界已经准备完成，可以直接进入游戏主流程。'}
            </p>
          </div>
        </div>
        <p>{homeText.currentWorld.description}</p>
        <div className="hero-callout__actions home-hero__actions">
          <Link className="pixel-button pixel-button--lg" to="/game">
            {homeText.currentWorld.continueAction}
          </Link>
          <button
            className="pixel-button pixel-button--info pixel-button--lg"
            disabled={isCreating}
            type="button"
            onClick={() => void runControllerTask(() => appWorldCreationController.createQuickPlayWorld())}
          >
            {homeText.templates.quickPlayAction}
          </button>
          <button
            className="pixel-button pixel-button--ghost pixel-button--lg"
            disabled={isCreating}
            type="button"
            onClick={() => void runControllerTask(() => appWorldCreationController.createDefaultWorld())}
          >
            {homeText.currentWorld.defaultWorldAction}
          </button>
        </div>
      </section>

      {recoveryNotice ? (
        <section className="startup-status-card">
          <Badge tone="warning">{homeText.recoveryBadge}</Badge>
          <p className="startup-status-card__body">{recoveryNotice}</p>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="startup-status-card startup-status-card--error">
          <Badge tone="warning">{homeText.creationErrorBadge}</Badge>
          <p className="startup-status-card__body">{errorMessage}</p>
        </section>
      ) : null}

      <div className="panel-grid panel-grid--two panel-grid--home" id="home-preview">
        <SectionCard
          title={homeText.templates.title}
          eyebrow={homeText.templates.eyebrow}
          description={homeText.templates.description}
          footer={homeText.templates.footer}
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
                  {homeText.templates.meta(
                    template.featuredOutputs.regions,
                    template.featuredOutputs.factions,
                    template.featuredOutputs.npcs,
                  )}
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
              {homeText.templates.quickPlayAction}
            </button>
            {developerToolsVisible ? (
              <button
                className="pixel-button pixel-button--ghost"
                disabled={isCreating}
                type="button"
                onClick={() => void runControllerTask(() => appWorldCreationController.createDevTestWorld())}
              >
                {homeText.templates.devModeAction}
              </button>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title={homeText.preview.title}
          eyebrow={homeText.preview.eyebrow}
          description={homeText.preview.description}
          footer={homeText.preview.footer}
          className="section-card--highlight"
        >
          <dl className="creation-preview-list">
            <div>
              <dt>{homeText.preview.worldNameLabel}</dt>
              <dd>{preview.worldName}</dd>
            </div>
            <div>
              <dt>{homeText.preview.regionsLabel}</dt>
              <dd>{preview.regions.join(' / ')}</dd>
            </div>
            <div>
              <dt>{homeText.preview.factionsLabel}</dt>
              <dd>{preview.factions.join(' / ')}</dd>
            </div>
            <div>
              <dt>{homeText.preview.mainQuestSeedLabel}</dt>
              <dd>{preview.mainQuestSeed}</dd>
            </div>
            <div>
              <dt>{homeText.preview.initialNpcSetLabel}</dt>
              <dd>{mockNpcDefinitions.map((npc) => npc.name).join(', ')}</dd>
            </div>
            <div>
              <dt>{homeText.preview.initialResourceSetupLabel}</dt>
              <dd>{preview.resourceSetup}</dd>
            </div>
            <div>
              <dt>{homeText.preview.initialStoryPremiseLabel}</dt>
              <dd>{preview.storyPremise}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        id="home-create"
        title={homeText.customWorld.title}
        eyebrow={homeText.customWorld.eyebrow}
        description={homeText.customWorld.description}
        footer={homeText.customWorld.footer}
        className="section-card--wide"
      >
        <form
          className="world-creation-form"
          onSubmit={(event) => {
            event.preventDefault();
            void runCreation(draft);
          }}
        >
          <label className="world-creation-form__field">
            <span>{homeText.customWorld.fields.theme}</span>
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
            <span>{homeText.customWorld.fields.worldStyle}</span>
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
            <span>{homeText.customWorld.fields.difficulty}</span>
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
              <option value="easy">{homeText.customWorld.difficultyOptions.easy}</option>
              <option value="normal">{homeText.customWorld.difficultyOptions.normal}</option>
              <option value="hard">{homeText.customWorld.difficultyOptions.hard}</option>
            </select>
          </label>

          <label className="world-creation-form__field world-creation-form__field--wide">
            <span>{homeText.customWorld.fields.gameGoal}</span>
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
            <span>{homeText.customWorld.fields.learningGoal}</span>
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
            <legend>{homeText.customWorld.fields.preference}</legend>
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
                  <span>{preferredModeLabels[mode]}</span>
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
              <span>{homeText.customWorld.fields.quickStart}</span>
            </label>

            {developerToolsVisible ? (
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
                <span>{homeText.customWorld.fields.devMode}</span>
              </label>
            ) : null}
          </div>

          <div className="hero-callout__actions">
            <button className="pixel-button" disabled={isCreating} type="submit">
              {isCreating
                ? homeText.customWorld.creatingAction
                : homeText.customWorld.createAction}
            </button>
            <button
              className="pixel-button pixel-button--ghost"
              disabled={isCreating}
              type="button"
              onClick={() => setDraft(defaultWorldCreationRequest)}
            >
              {homeText.customWorld.resetAction}
            </button>
          </div>
        </form>
      </SectionCard>

      {developerToolsVisible ? (
        <section
          className="developer-entry"
          id="home-debug"
          aria-label={homeText.developerTools.title}
        >
          <div className="developer-entry__copy">
            <p className="developer-entry__title">{homeText.developerTools.title}</p>
            <p className="developer-entry__description">
              {homeText.developerTools.description}
            </p>
          </div>
          <Link className="pixel-button pixel-button--ghost" to="/debug">
            {homeText.developerTools.action}
          </Link>
        </section>
      ) : null}
    </PageFrame>
  );
}
