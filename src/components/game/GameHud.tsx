import type { AreaSceneStageModel } from '../map/areaSceneStage.contract';
import { GameBottomDock } from './GameBottomDock';
import { GameLeftSidebar } from './GameLeftSidebar';
import { GameRightSidebar } from './GameRightSidebar';
import { GameSceneViewport } from './GameSceneViewport';
import { GameTopBar } from './GameTopBar';

interface GameHudProps {
  topBar: {
    worldName: string;
    worldSubtitle?: string;
    currentArea: string;
    areaType: string;
    timeWeather: string;
    saveStatus: string;
    saveDetail: string;
    saveTone: 'default' | 'success' | 'warning' | 'info';
    isSaving: boolean;
  };
  leftSidebar: {
    areas: Array<{
      id: string;
      name: string;
      status: string;
      isCurrent: boolean;
      isDiscovered: boolean;
      isUnlocked: boolean;
      isConnected: boolean;
    }>;
    progressPercent: number;
    progressMetrics: Array<{ label: string; value: string }>;
    areaSummary: string;
  };
  scene: {
    areaName: string;
    areaType: string;
    description: string;
    sceneStatus: string;
    stage: AreaSceneStageModel;
    npcs: Array<{
      id: string;
      name: string;
      role: string;
      disposition: string;
      trust: number;
      relationship: number;
    }>;
    events: Array<{
      id: string;
      title: string;
      detail: string;
      isPending: boolean;
      isTriggered: boolean;
    }>;
  };
  rightSidebar: {
    quests: Array<{
      id: string;
      title: string;
      status: string;
      objective: string;
      progress: string;
    }>;
    inventory: Array<{
      id: string;
      label: string;
      quantity: number;
    }>;
    playerStatus: Array<{ label: string; value: string }>;
    playerTags: string[];
    relationships: Array<{
      id: string;
      name: string;
      trust: number;
      relationship: number;
      disposition: string;
    }>;
    enemyAlerts: Array<{
      id: string;
      label: string;
      detail: string;
      tone: 'default' | 'success' | 'warning' | 'info';
    }>;
  };
  bottom: {
    dialogueTitle: string;
    dialogueSpeaker: string;
    dialogueLines: Array<{ speaker: string; text: string }>;
    controls: Array<{
      id: string;
      label: string;
      tone?: 'default' | 'success' | 'warning' | 'info';
      disabled?: boolean;
    }>;
    logs: Array<{
      id: string;
      label: string;
      detail: string;
      meta: string;
      tone: 'default' | 'success' | 'warning' | 'info';
      emphasis: 'default' | 'recent' | 'highlight';
    }>;
    tips: Array<{
      id: string;
      title: string;
      summary: string;
      tone: 'default' | 'success' | 'warning' | 'info';
    }>;
    statusMessage: string;
    activeControlId?: string | null;
  };
  busyAreaId?: string | null;
  onManualSave: () => void;
  onAreaSelect: (areaId: string) => void;
  onNpcSelect: (npcId: string) => void;
  onMarkerActivate: (markerId: string) => void;
  onEventActivate: (eventId: string) => void;
  onControlSelect: (controlId: string) => void;
}

export function GameHud({
  topBar,
  leftSidebar,
  scene,
  rightSidebar,
  bottom,
  busyAreaId,
  onManualSave,
  onAreaSelect,
  onNpcSelect,
  onMarkerActivate,
  onEventActivate,
  onControlSelect,
}: GameHudProps) {
  return (
    <section className="game-layout" aria-label="主游戏界面">
      <GameTopBar {...topBar} onManualSave={onManualSave} />
      <div className="game-layout__body">
        <GameLeftSidebar
          {...leftSidebar}
          busyAreaId={busyAreaId}
          onAreaSelect={onAreaSelect}
        />
        <GameSceneViewport
          {...scene}
          onNpcSelect={onNpcSelect}
          onMarkerActivate={onMarkerActivate}
          onEventActivate={onEventActivate}
        />
        <GameRightSidebar {...rightSidebar} />
      </div>
      <GameBottomDock {...bottom} onControlSelect={onControlSelect} />
    </section>
  );
}
