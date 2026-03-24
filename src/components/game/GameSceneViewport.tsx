import type { AreaSceneStageModel } from '../map/areaSceneStage.contract';
import type { PixelSceneRenderModel } from '../map/phaser/pixelSceneRenderer.contract';
import { PhaserAreaSceneViewport } from '../map/phaser/PhaserAreaSceneViewport';
import { Badge } from '../pixel-ui/Badge';
import { PixelButton } from '../pixel-ui/PixelButton';
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

interface SceneEventViewModel {
  id: string;
  title: string;
  detail: string;
  isPending: boolean;
  isTriggered: boolean;
}

interface GameSceneViewportProps {
  areaName: string;
  areaType: string;
  description: string;
  sceneStatus: string;
  stage: AreaSceneStageModel;
  renderScene: PixelSceneRenderModel;
  npcs: SceneNpcViewModel[];
  events: SceneEventViewModel[];
  interactionLocked?: boolean;
  onNpcSelect: (npcId: string) => void;
  onMarkerActivate: (markerId: string, source?: 'manual' | 'approach') => void;
  onEventActivate: (eventId: string) => void;
}

export function GameSceneViewport({
  areaName,
  areaType,
  description,
  sceneStatus,
  stage,
  renderScene,
  npcs,
  events,
  interactionLocked = false,
  onNpcSelect,
  onMarkerActivate,
  onEventActivate,
}: GameSceneViewportProps) {
  return (
    <section className="game-scene">
      <GamePanel
        title="主场景 / 区域视窗"
        eyebrow={`${areaName} · ${areaType}`}
        description={description}
        footer={sceneStatus}
        className="game-scene__panel"
      >
        <div className="game-scene__event-strip">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="game-scene__event-pill"
              onClick={() => onEventActivate(event.id)}
            >
              <div className="game-scene__event-copy">
                <strong>{event.title}</strong>
                <span>{event.detail}</span>
              </div>
              <Badge tone={event.isPending ? 'warning' : event.isTriggered ? 'success' : 'info'}>
                {event.isPending ? '待触发' : event.isTriggered ? '已触发' : '可触发'}
              </Badge>
            </button>
          ))}
        </div>

        <PhaserAreaSceneViewport
          model={renderScene}
          interactionLocked={interactionLocked}
          fallbackStage={stage}
          areaName={areaName}
          areaType={areaType}
          onNpcSelect={onNpcSelect}
          onMarkerActivate={onMarkerActivate}
        />

        <div className="game-scene__details">
          <div className="game-scene__details-block">
            <h4>区域角色</h4>
            <div className="game-scene__npc-grid">
              {npcs.map((npc) => (
                <button
                  key={npc.id}
                  type="button"
                  className="game-scene__npc-card"
                  onClick={() => onNpcSelect(npc.id)}
                >
                  <strong>{npc.name}</strong>
                  <span>{npc.role}</span>
                  <span>{npc.disposition} · {npc.emotionalState}</span>
                  <span>信任 {npc.trust} · 关系 {npc.relationship}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="game-scene__details-block">
            <h4>交互点位</h4>
            <div className="game-scene__marker-list">
              {stage.markers.map((marker) => (
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
          </div>
        </div>
      </GamePanel>
    </section>
  );
}
