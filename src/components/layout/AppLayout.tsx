import { NavLink, Outlet } from 'react-router-dom';

import { routeMeta } from '../../app/router/routeMeta';
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
            <div className="app-shell__meta">
              <Badge tone="success">{appLayoutText.badges.milestone}</Badge>
              <Badge tone="warning">{appLayoutText.badges.mockFirst}</Badge>
              <Badge tone={startupTone}>{startupLabels[startupSource]}</Badge>
            </div>
          </div>
          <nav className="app-shell__nav" aria-label={appLayoutText.navigationAriaLabel}>
            {routeMeta.map((entry) => (
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
          <div className="app-shell__meta">
            <Badge tone="info">{currentRoute.label}</Badge>
            <span>{currentRoute.summary}</span>
          </div>
          <div className="app-shell__meta">
            <Badge tone={startupTone}>{startupLabels[startupSource]}</Badge>
            <span>{startupMessages[startupReason]}</span>
          </div>
          <div className="app-shell__meta">
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
      </div>
    </div>
  );
}
