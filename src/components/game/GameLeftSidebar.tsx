import { Badge } from '../pixel-ui/Badge';
import { PixelButton } from '../pixel-ui/PixelButton';
import { GamePanel } from './GamePanel';

interface AreaNodeViewModel {
  id: string;
  name: string;
  status: string;
  isCurrent: boolean;
  isDiscovered: boolean;
  isUnlocked: boolean;
  isConnected: boolean;
}

interface ProgressMetric {
  label: string;
  value: string;
}

interface GameLeftSidebarProps {
  areas: AreaNodeViewModel[];
  progressPercent: number;
  progressMetrics: ProgressMetric[];
  areaSummary: string;
  onAreaSelect: (areaId: string) => void;
  busyAreaId?: string | null;
}

export function GameLeftSidebar({
  areas,
  progressPercent,
  progressMetrics,
  areaSummary,
  onAreaSelect,
  busyAreaId,
}: GameLeftSidebarProps) {
  return (
    <aside className="game-sidebar game-sidebar--left">
      <GamePanel
        title="Area Cartography"
        eyebrow="Minimap / Area Map"
        description="Track linked regions, discovered ground, and current position."
        footer={areaSummary}
      >
        <div className="game-minimap">
          {areas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={[
                'game-minimap__node',
                area.isCurrent ? 'game-minimap__node--current' : '',
                area.isUnlocked ? 'game-minimap__node--unlocked' : '',
                area.isDiscovered ? 'game-minimap__node--discovered' : '',
                area.isConnected ? 'game-minimap__node--connected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onAreaSelect(area.id)}
              disabled={busyAreaId === area.id || area.isCurrent}
            >
              <span className="game-minimap__node-name">{area.name}</span>
              <span className="game-minimap__node-status">{area.status}</span>
            </button>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="Area Switching"
        eyebrow="Route Entry"
        description="Jump through the explored network without putting routing logic into the HUD."
      >
        <div className="game-sidebar__button-stack">
          {areas.map((area) => (
            <PixelButton
              key={area.id}
              variant={area.isCurrent ? 'solid' : 'ghost'}
              tone={area.isCurrent ? 'warning' : area.isConnected ? 'info' : 'default'}
              isActive={area.isCurrent}
              onClick={() => onAreaSelect(area.id)}
              disabled={busyAreaId === area.id || area.isCurrent}
            >
              {area.isCurrent ? `In ${area.name}` : `Enter ${area.name}`}
            </PixelButton>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="Exploration Progress"
        eyebrow="World Scan"
        description="Show judges exactly how much of the world loop is already open."
      >
        <div className="game-progress">
          <div className="game-progress__track" aria-hidden="true">
            <div
              className="game-progress__fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="game-progress__meta">
            <strong>{progressPercent}% explored</strong>
            <Badge tone="info">Persistent map state</Badge>
          </div>
          <dl className="game-stat-list">
            {progressMetrics.map((metric) => (
              <div key={metric.label} className="game-stat-list__item">
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </GamePanel>
    </aside>
  );
}
