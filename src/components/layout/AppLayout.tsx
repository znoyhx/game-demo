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
import { Badge } from '../pixel-ui/Badge';

const startupLabels = {
  pending: 'Booting',
  save: 'Loaded Save',
  mock: 'Loaded Mock',
} as const;

const startupMessages = {
  booting: 'Checking persistence and preparing the latest playable state.',
  'save-restored': 'Latest valid save restored through the persistence layer.',
  'no-save': 'No prior save found. Default mock world loaded for the MVP slice.',
  'invalid-save': 'Invalid save detected. Startup fell back safely to the default mock world.',
  'storage-error':
    'Save storage could not be read. Startup fell back safely to the default mock world.',
} as const;

export function AppLayout() {
  const currentRoute = useShellStore((state) => state.currentRoute);
  const startupSource = useGameStore(selectStartupSource);
  const startupReason = useGameStore(selectStartupReason);
  const worldSummary = useGameStore(selectWorldSummary);
  const currentArea = useGameStore(selectCurrentArea);
  const saveMetadata = useGameStore(selectSaveMetadata);

  const startupTone =
    startupSource === 'save'
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
              <span className="app-shell__eyebrow">PixelForge Agent</span>
              <h1 className="app-shell__title">Competition MVP Scaffold</h1>
              <p className="app-shell__subtitle">
                Web-first, mock-first, and structured for a clean handoff into gameplay,
                persistence, agent orchestration, and debug tooling.
              </p>
            </div>
            <div className="app-shell__meta">
              <Badge tone="success">M0 Foundation</Badge>
              <Badge tone="warning">Mock-First</Badge>
              <Badge tone={startupTone}>{startupLabels[startupSource]}</Badge>
            </div>
          </div>
          <nav className="app-shell__nav" aria-label="Primary">
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
            <Badge tone="info">{startupReady ? worldSummary.name : 'Startup Pending'}</Badge>
            <span>
              {startupReady
                ? `${currentArea ? `${currentArea.name} active area` : 'World shell ready'} / ${
                    saveMetadata.label ?? saveMetadata.slot ?? saveMetadata.id
                  }`
                : 'Validating the latest save and preparing the first playable state.'}
            </span>
          </div>
        </header>
        <main className="app-shell__content">
          {startupSource === 'pending' ? (
            <section className="page-frame">
              <header className="page-frame__header">
                <h2 className="page-frame__title">Booting Startup Flow</h2>
                <p className="page-frame__description">{startupMessages.booting}</p>
              </header>
              <div className="startup-status-card">
                <Badge tone="info">Startup Controller</Badge>
                <p className="startup-status-card__body">
                  The app is loading the latest valid save through the persistence abstraction.
                  If no valid save is available, it will fall back to the deterministic mock
                  world.
                </p>
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
