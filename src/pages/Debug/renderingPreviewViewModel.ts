import { buildForcedRenderMapState } from '../../core/state/renderPreview';
import type { GamePageViewModel, GamePageViewModelSource } from '../Game/gameViewModel';
import { buildGamePageViewModel } from '../Game/gameViewModel';

export interface RenderingPreviewViewModel {
  copy: {
    title: string;
    eyebrow: string;
    description: string;
    footer: string;
    openSceneAction: string;
    clearForcedAction: string;
    liveBadge: string;
    forcedBadge: (areaName: string) => string;
    previewing: (areaName: string) => string;
    mapAreaTitle: string;
    npcLayerTitle: string;
    npcLayerDescription: string;
    npcLayerFooter: (count: number) => string;
    interactionLayerTitle: string;
    interactionLayerDescription: string;
    interactionLayerFooter: (count: number) => string;
  };
  selectedAreaId: string | null;
  forcedAreaId: string | null;
  forcedAreaName: string | null;
  areaOptions: Array<{
    id: string;
    name: string;
    isSelected: boolean;
    isForced: boolean;
  }>;
  scene: GamePageViewModel['scene'];
  quests: GamePageViewModel['rightSidebar']['quests'];
  dialogue: {
    dialogueTitle: string;
    dialogueSpeaker: string;
    dialogueLines: Array<{ speaker: string; text: string }>;
    controls: Array<{
      id: string;
      label: string;
      tone?: 'default' | 'success' | 'warning' | 'info';
      disabled?: boolean;
    }>;
    statusMessage: string;
    activeControlId?: string | null;
    onControlSelect: (controlId: string) => void;
  };
  npcMarkerCount: number;
  onMarkerActivate: (markerId: string) => void;
}

interface BuildRenderingPreviewViewModelParams {
  source: GamePageViewModelSource;
  previewAreaId: string | null;
  forcedAreaId: string | null;
  onMarkerActivate: (markerId: string) => void;
  onControlSelect: (controlId: string) => void;
  copy: RenderingPreviewViewModel['copy'];
  activeControlId?: string | null;
  previewStatusMessage?: string | null;
}

export function buildRenderingPreviewViewModel({
  source,
  previewAreaId,
  forcedAreaId,
  onMarkerActivate,
  onControlSelect,
  copy,
  activeControlId,
  previewStatusMessage,
}: BuildRenderingPreviewViewModelParams): RenderingPreviewViewModel {
  const selectedArea =
    source.areas.find((area) => area.id === previewAreaId) ??
    source.currentArea ??
    source.areas[0] ??
    null;
  const effectiveMapState = buildForcedRenderMapState(
    source.mapState,
    selectedArea?.id ?? null,
  );
  const viewModel = buildGamePageViewModel({
    ...source,
    currentArea: selectedArea,
    mapState: effectiveMapState,
  });
  const leadNpc = viewModel.scene.npcs[0];
  const highlightedEvent = viewModel.scene.events.find((event) => event.isPending);
  const npcMarkerCount = viewModel.scene.stage.markers.filter(
    (marker) => marker.type === 'npc' || marker.type === 'shop',
  ).length;
  const forcedAreaName =
    source.areas.find((area) => area.id === forcedAreaId)?.name ?? null;
  const defaultStatusMessage =
    forcedAreaId === selectedArea?.id
      ? '该区域当前已被强制注入主游戏场景。'
      : '当前为仅预览渲染，无需任务或进度前置条件。';

  return {
    copy,
    selectedAreaId: selectedArea?.id ?? null,
    forcedAreaId,
    forcedAreaName,
    areaOptions: source.areas.map((area) => ({
      id: area.id,
      name: area.name,
      isSelected: area.id === selectedArea?.id,
      isForced: area.id === forcedAreaId,
    })),
    scene: viewModel.scene,
    quests: viewModel.rightSidebar.quests,
    dialogue: {
      dialogueTitle: leadNpc ? '对话预览' : '场景简报',
      dialogueSpeaker: leadNpc?.name ?? viewModel.scene.areaName,
      dialogueLines: leadNpc
        ? [
            {
              speaker: leadNpc.name,
              text: `已为独立预览渲染准备好一条“${leadNpc.disposition}”倾向的回应。`,
            },
            {
              speaker: '系统',
              text: viewModel.scene.description,
            },
            {
              speaker: '事件',
              text:
                highlightedEvent?.detail ??
                '当前没有待触发事件打断这个预览场景。',
            },
          ]
        : [
            {
              speaker: '系统',
              text: viewModel.scene.description,
            },
            {
              speaker: '向导',
              text: '可通过调试预览直接校验对话渲染，无需先推进完整角色流程。',
            },
          ],
      controls: [
        { id: 'preview-greet', label: '问候', tone: 'success' },
        { id: 'preview-ask', label: '询问', tone: 'info' },
        { id: 'preview-quest', label: '任务', tone: 'warning' },
        { id: 'preview-leave', label: '离开', tone: 'default' },
      ],
      statusMessage: previewStatusMessage ?? defaultStatusMessage,
      activeControlId,
      onControlSelect,
    },
    npcMarkerCount,
    onMarkerActivate,
  };
}
