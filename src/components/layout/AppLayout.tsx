import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { primaryRouteMeta } from '../../app/router/routeMeta';
import {
  selectCurrentArea,
  selectSaveMetadata,
  selectStartupReason,
  selectStartupSource,
  selectWorldSummary,
  useGameStore,
  useShellStore,
} from '../../core/state';
import { cn } from '../../core/utils/cn';
import { locale } from '../../core/utils/locale';
import { Badge } from '../pixel-ui/Badge';

const startupLabels = locale.labels.startupSources;
const startupMessages = locale.labels.startupReasons;
const appLayoutText = locale.appLayout;

export function AppLayout() {
  const currentRoute = useShellStore((state) => state.currentRoute);
  const developerToolsVisible = useShellStore((state) => state.developerToolsVisible);
  const setDeveloperToolsVisible = useShellStore((state) => state.setDeveloperToolsVisible);
  const toggleDeveloperToolsVisible = useShellStore((state) => state.toggleDeveloperToolsVisible);
  const startupSource = useGameStore(selectStartupSource);
  const startupReason = useGameStore(selectStartupReason);
  const worldSummary = useGameStore(selectWorldSummary);
  const currentArea = useGameStore(selectCurrentArea);
  const saveMetadata = useGameStore(selectSaveMetadata);

  const startupTone =
    startupSource === 'save' || startupSource === 'generated'
      ? 'success'
      : startupSource === 'mock'
        ? 'warning'
        : 'info';
  const startupReady = startupSource !== 'pending';
  const developerEntryVisible = developerToolsVisible || currentRoute.id === 'debug';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKey = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && pressedKey === 'd') {
        event.preventDefault();
        toggleDeveloperToolsVisible();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDeveloperToolsVisible]);

  useEffect(() => {
    if (currentRoute.id === 'debug') {
      setDeveloperToolsVisible(true);
    }
  }, [currentRoute.id, setDeveloperToolsVisible]);

  return (
    <div className="app-shell">
      <div className="app-shell__frame">
        <header className="app-shell__header">
          <div className="app-shell__header-top">
            <div className="app-shell__title-wrap">
              <span className="app-shell__eyebrow">{appLayoutText.eyebrow}</span>
              <h1 className="app-shell__title">{appLayoutText.title}</h1>
              <p className="app-shell__subtitle">{appLayoutText.subtitle}</p>
            </div>
            <div className="app-shell__meta app-shell__meta--header">
              <Badge tone="success">{appLayoutText.badges.milestone}</Badge>
              <Badge tone="warning">{appLayoutText.badges.mockFirst}</Badge>
            </div>
          </div>
          <div className="app-shell__header-row">
            <nav className="app-shell__nav" aria-label={appLayoutText.navigationAriaLabel}>
              {primaryRouteMeta.map((entry) => (
                <NavLink
                  key={entry.id}
                  to={entry.path}
                  end={entry.path === '/'}
                  className={({ isActive }) =>
                    cn('app-shell__nav-link', isActive && 'app-shell__nav-link--active')
                  }
                >
                  {entry.label}
                </NavLink>
              ))}
            </nav>
            <div className="app-shell__route-panel">
              <Badge tone="info">{currentRoute.label}</Badge>
              <p className="app-shell__route-summary">{currentRoute.summary}</p>
            </div>
          </div>
          <div className="app-shell__status-strip">
            <div className="app-shell__meta app-shell__meta--status">
              <Badge tone={startupTone}>{startupLabels[startupSource]}</Badge>
              <span>{startupMessages[startupReason]}</span>
            </div>
            <div className="app-shell__meta app-shell__meta--status">
              <Badge tone="info">
                {startupReady ? worldSummary.name : appLayoutText.pendingWorldBadge}
              </Badge>
              <span>
                {startupReady
                  ? appLayoutText.readyWorldStatus(
                      currentArea?.name,
                      saveMetadata.label ?? saveMetadata.slot ?? saveMetadata.id,
                    )
                  : appLayoutText.pendingWorldStatus}
              </span>
            </div>
          </div>
        </header>
        <main className="app-shell__content">
          {startupSource === 'pending' ? (
            <section className="page-frame">
              <header className="page-frame__header">
                <h2 className="page-frame__title">{appLayoutText.startupSectionTitle}</h2>
                <p className="page-frame__description">{startupMessages.booting}</p>
              </header>
              <div className="startup-status-card">
                <Badge tone="info">{appLayoutText.startupControllerBadge}</Badge>
                <p className="startup-status-card__body">{appLayoutText.startupControllerBody}</p>
              </div>
            </section>
          ) : (
            <Outlet />
          )}
        </main>
        {developerEntryVisible ? (
          <aside className="app-shell__developer-dock" aria-label="开发者入口">
            <div className="app-shell__developer-copy">
              <Badge tone="warning">开发模式</Badge>
              <p className="app-shell__developer-title">开发者入口已启用</p>
              <p className="app-shell__developer-description">
                主流程只保留首页、游戏与回顾；需要时可从这里进入调试页，或使用
                Ctrl+Shift+D 保持开发入口可见。
              </p>
            </div>
            <div className="app-shell__developer-actions">
              <Link className="pixel-button pixel-button--ghost" to="/debug">
                打开调试页
              </Link>
              {currentRoute.id !== 'debug' ? (
                <button
                  className="pixel-button pixel-button--ghost"
                  type="button"
                  onClick={() => setDeveloperToolsVisible(false)}
                >
                  隐藏入口
                </button>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
