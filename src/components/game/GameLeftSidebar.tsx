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
        title="区域地图"
        eyebrow="小地图 / 区域图"
        description="跟踪连通区域、已发现地带与当前位置。"
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
        title="区域切换"
        eyebrow="路线入口"
        description="在已探索的网络中切换区域，同时保持界面层不承载路由规则。"
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
              {area.isCurrent ? `位于 ${area.name}` : `进入 ${area.name}`}
            </PixelButton>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="探索进度"
        eyebrow="世界扫描"
        description="清楚展示当前世界循环已经开放了多少内容。"
      >
        <div className="game-progress">
          <div className="game-progress__track" aria-hidden="true">
            <div
              className="game-progress__fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="game-progress__meta">
            <strong>已探索 {progressPercent}%</strong>
            <Badge tone="info">地图持久状态</Badge>
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
