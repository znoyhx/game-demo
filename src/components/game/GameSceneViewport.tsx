import type { AreaSceneStageModel } from '../map/areaSceneStage.contract';
import type { PixelSceneRenderModel } from '../map/phaser/pixelSceneRenderer.contract';
import { PhaserAreaSceneViewport } from '../map/phaser/PhaserAreaSceneViewport';
import { StatusChip } from '../pixel-ui/StatusChip';
import { GamePanel } from './GamePanel';

interface SceneEventViewModel {
  id: string;
  title: string;
  detail: string;
  isPending: boolean;
  isTriggered: boolean;
  naturallyTriggerable: boolean;
  naturalReason?: string;
}

interface GameSceneViewportProps {
  areaName: string;
  areaType: string;
  description: string;
  sceneStatus: string;
  stage: AreaSceneStageModel;
  renderScene: PixelSceneRenderModel;
  events: SceneEventViewModel[];
  interactionLocked?: boolean;
  onNpcSelect: (npcId: string) => void;
  onMarkerActivate: (markerId: string, source?: 'manual' | 'approach') => void;
  onEventActivate: (eventId: string) => void;
}

const resolveEventStatusLabel = (event: SceneEventViewModel) => {
  if (event.isPending) {
    return '待触发';
  }

  if (event.isTriggered) {
    return '已发生';
  }

  return event.naturallyTriggerable ? '当前可触发' : '当前不可触发';
};

const resolveEventStatusTone = (event: SceneEventViewModel) => {
  if (event.isPending) {
    return 'warning' as const;
  }

  if (event.isTriggered) {
    return 'success' as const;
  }

  return event.naturallyTriggerable ? ('info' as const) : ('default' as const);
};

export function GameSceneViewport({
  areaName,
  areaType,
  description,
  sceneStatus,
  stage,
  renderScene,
  events,
  interactionLocked = false,
  onNpcSelect,
  onMarkerActivate,
  onEventActivate,
}: GameSceneViewportProps) {
  return (
    <section className="game-scene" id="game-scene">
      <GamePanel
        title="主场景"
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
                {!event.isPending && !event.isTriggered && event.naturalReason ? (
                  <span>{event.naturalReason}</span>
                ) : null}
              </div>
              <StatusChip
                label="状态"
                value={resolveEventStatusLabel(event)}
                tone={resolveEventStatusTone(event)}
              />
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
      </GamePanel>
    </section>
  );
}
