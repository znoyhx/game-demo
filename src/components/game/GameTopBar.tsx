import { Badge } from '../pixel-ui/Badge';
import { PixelButton } from '../pixel-ui/PixelButton';

interface GameTopBarProps {
  worldName: string;
  worldSubtitle?: string;
  currentArea: string;
  areaType: string;
  timeWeather: string;
  saveStatus: string;
  saveDetail: string;
  saveTone: 'default' | 'success' | 'warning' | 'info';
  onManualSave: () => void;
  isSaving: boolean;
}

export function GameTopBar({
  worldName,
  worldSubtitle,
  currentArea,
  areaType,
  timeWeather,
  saveStatus,
  saveDetail,
  saveTone,
  onManualSave,
  isSaving,
}: GameTopBarProps) {
  return (
    <section className="game-topbar" aria-label="主游戏状态">
      <div className="game-topbar__item game-topbar__item--world">
        <p className="game-topbar__label">世界名称</p>
        <strong className="game-topbar__value">{worldName}</strong>
        {worldSubtitle ? <span className="game-topbar__detail">{worldSubtitle}</span> : null}
      </div>
      <div className="game-topbar__item">
        <p className="game-topbar__label">当前区域</p>
        <strong className="game-topbar__value">{currentArea}</strong>
        <span className="game-topbar__detail">{areaType}</span>
      </div>
      <div className="game-topbar__item">
        <p className="game-topbar__label">时间 / 天候</p>
        <strong className="game-topbar__value">{timeWeather}</strong>
        <span className="game-topbar__detail">世界实时状态</span>
      </div>
      <div className="game-topbar__item game-topbar__item--save">
        <div className="game-topbar__save-header">
          <p className="game-topbar__label">存档状态</p>
          <Badge tone={saveTone}>{saveStatus}</Badge>
        </div>
        <strong className="game-topbar__value">{saveDetail}</strong>
        <PixelButton tone="success" onClick={onManualSave} disabled={isSaving}>
          {isSaving ? '正在保存...' : '立即保存'}
        </PixelButton>
      </div>
    </section>
  );
}
