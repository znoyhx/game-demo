import type { AreaSceneStageModel } from '../map/areaSceneStage.contract';
import type { PixelSceneRenderModel } from '../map/phaser/pixelSceneRenderer.contract';
import { PixelTabs } from '../pixel-ui/PixelTabs';
import { DialoguePanel } from './DialoguePanel';
import { GameLeftSidebar } from './GameLeftSidebar';
import { GameRightSidebar } from './GameRightSidebar';
import { GameSceneDetailsPanels } from './GameSceneDetailsPanels';
import { GameSceneViewport } from './GameSceneViewport';
import { GameSupportPanels } from './GameSupportPanels';
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
    renderScene: PixelSceneRenderModel;
    npcs: Array<{
      id: string;
      name: string;
      role: string;
      disposition: string;
      emotionalState: string;
      trust: number;
      relationship: number;
    }>;
    events: Array<{
      id: string;
      title: string;
      detail: string;
      isPending: boolean;
      isTriggered: boolean;
      naturallyTriggerable: boolean;
      naturalReason?: string;
    }>;
    interactionLocked?: boolean;
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
      emotionalState: string;
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
    attitudeSummary?: Array<{
      label: string;
      value: string;
    }>;
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
  onMarkerActivate: (markerId: string, source?: 'manual' | 'approach') => void;
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
  const gameSections = [
    { id: 'scene', label: '主场景', href: '#game-scene', isActive: true },
    { id: 'journey', label: '行路地图', href: '#game-journey' },
    { id: 'status', label: '旅程状态', href: '#game-status' },
    { id: 'dialogue', label: '对话与战斗', href: '#game-dialogue' },
  ];

  return (
    <section className="game-layout" aria-label="主游戏界面">
      <GameTopBar {...topBar} onManualSave={onManualSave} />
      <PixelTabs items={gameSections} label="游戏页面分区" className="game-layout__tabs" />
      <div className="game-layout__main">
        <div className="game-layout__primary">
          <GameSceneViewport
            areaName={scene.areaName}
            areaType={scene.areaType}
            description={scene.description}
            sceneStatus={scene.sceneStatus}
            stage={scene.stage}
            renderScene={scene.renderScene}
            events={scene.events}
            interactionLocked={scene.interactionLocked}
            onNpcSelect={onNpcSelect}
            onMarkerActivate={onMarkerActivate}
            onEventActivate={onEventActivate}
          />
          <DialoguePanel
            dialogueTitle={bottom.dialogueTitle}
            dialogueSpeaker={bottom.dialogueSpeaker}
            dialogueLines={bottom.dialogueLines}
            attitudeSummary={bottom.attitudeSummary}
            controls={bottom.controls}
            statusMessage={bottom.statusMessage}
            onControlSelect={onControlSelect}
            activeControlId={bottom.activeControlId}
            className="game-layout__dialogue"
          />
        </div>
      </div>
      <div className="game-layout__rail">
        <GameSceneDetailsPanels
          npcs={scene.npcs}
          markers={scene.stage.markers}
          onNpcSelect={onNpcSelect}
          onMarkerActivate={onMarkerActivate}
        />
        <GameLeftSidebar
          {...leftSidebar}
          busyAreaId={busyAreaId}
          onAreaSelect={onAreaSelect}
        />
        <GameRightSidebar {...rightSidebar} />
        <GameSupportPanels logs={bottom.logs} tips={bottom.tips} />
      </div>
    </section>
  );
}
