import type { AreaSceneStageModel } from '../map/areaSceneStage.contract';
import { PixelButton } from '../pixel-ui/PixelButton';
import { StatusChip } from '../pixel-ui/StatusChip';
import { GamePanel } from './GamePanel';

interface SceneNpcViewModel {
  id: string;
  name: string;
  role: string;
  disposition: string;
  emotionalState: string;
  trust: number;
  relationship: number;
}

interface GameSceneDetailsPanelsProps {
  npcs: SceneNpcViewModel[];
  markers: AreaSceneStageModel['markers'];
  onNpcSelect: (npcId: string) => void;
  onMarkerActivate: (markerId: string, source?: 'manual' | 'approach') => void;
}

export function GameSceneDetailsPanels({
  npcs,
  markers,
  onNpcSelect,
  onMarkerActivate,
}: GameSceneDetailsPanelsProps) {
  return (
    <div className="game-layout__details">
      <GamePanel
        title="同行角色"
        eyebrow="场景关系"
        description="把当前同行对象集中展示，避免挤占像素画面的核心区域。"
      >
        <div className="game-scene__npc-grid">
          {npcs.map((npc) => (
            <button
              key={npc.id}
              type="button"
              className="game-scene__npc-card ui-list-card ui-list-card--npc"
              onClick={() => onNpcSelect(npc.id)}
            >
              <div className="ui-list-card__header">
                <strong>{npc.name}</strong>
                <StatusChip label="定位" value={npc.role} tone="info" />
              </div>
              <p>
                {npc.disposition} · {npc.emotionalState}
              </p>
              <span className="ui-list-card__meta">
                信任 {npc.trust} · 关系 {npc.relationship}
              </span>
            </button>
          ))}
        </div>
      </GamePanel>

      <GamePanel
        title="交互入口"
        eyebrow="场景指引"
        description="把地图入口与标记交互集中放到底部横排，演示时更容易扫描。"
      >
        <div className="game-scene__marker-list">
          {markers.map((marker) => (
            <PixelButton
              key={marker.id}
              variant="ghost"
              tone={marker.feedbackTone}
              onClick={() => onMarkerActivate(marker.id, 'manual')}
              disabled={!marker.enabled}
            >
              {marker.typeLabel}: {marker.label} · {marker.caption}
            </PixelButton>
          ))}
        </div>
      </GamePanel>
    </div>
  );
}
