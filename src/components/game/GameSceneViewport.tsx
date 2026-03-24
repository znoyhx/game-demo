import type { AreaSceneStageModel } from '../map/areaSceneStage.contract';
import { AreaSceneStage } from '../map/AreaSceneStage';
import { Badge } from '../pixel-ui/Badge';
import { PixelButton } from '../pixel-ui/PixelButton';
import { GamePanel } from './GamePanel';

interface SceneNpcViewModel {
  id: string;
  name: string;
  role: string;
  disposition: string;
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
  npcs: SceneNpcViewModel[];
  events: SceneEventViewModel[];
  onNpcSelect: (npcId: string) => void;
  onMarkerActivate: (markerId: string) => void;
  onEventActivate: (eventId: string) => void;
}

export function GameSceneViewport({
  areaName,
  areaType,
  description,
  sceneStatus,
  stage,
  npcs,
  events,
  onNpcSelect,
  onMarkerActivate,
  onEventActivate,
}: GameSceneViewportProps) {
  return (
    <section className="game-scene">
      <GamePanel
        title="Main Scene / Area Viewport"
        eyebrow={`${areaName} 路 ${areaType}`}
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
                {event.isPending ? 'Pending' : event.isTriggered ? 'Triggered' : 'Ready'}
              </Badge>
            </button>
          ))}
        </div>

        <AreaSceneStage
          areaName={areaName}
          areaType={areaType}
          model={stage}
          onMarkerActivate={onMarkerActivate}
        />

        <div className="game-scene__details">
          <div className="game-scene__details-block">
            <h4>NPCs</h4>
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
                  <span>{npc.disposition}</span>
                  <span>Trust {npc.trust} 路 Relation {npc.relationship}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="game-scene__details-block">
            <h4>Interaction Points</h4>
            <div className="game-scene__marker-list">
              {stage.markers.map((marker) => (
                <PixelButton
                  key={marker.id}
                  variant="ghost"
                  tone={marker.feedbackTone}
                  onClick={() => onMarkerActivate(marker.id)}
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
