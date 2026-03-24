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
      ? 'This area is currently forced into the main game scene.'
      : 'Preview-only render; no quest or progression prerequisite is required.';

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
      dialogueTitle: leadNpc ? 'Dialogue Preview' : 'Scene Briefing',
      dialogueSpeaker: leadNpc?.name ?? viewModel.scene.areaName,
      dialogueLines: leadNpc
        ? [
            {
              speaker: leadNpc.name,
              text: `${leadNpc.disposition} response line prepared for isolated preview rendering.`,
            },
            {
              speaker: 'System',
              text: viewModel.scene.description,
            },
            {
              speaker: 'Event',
              text:
                highlightedEvent?.detail ??
                'No pending event is interrupting the preview scene.',
            },
          ]
        : [
            {
              speaker: 'System',
              text: viewModel.scene.description,
            },
            {
              speaker: 'Guide',
              text: 'Use the debug preview to validate dialogue rendering without full NPC progression.',
            },
          ],
      controls: [
        { id: 'preview-greet', label: 'Greet', tone: 'success' },
        { id: 'preview-ask', label: 'Ask', tone: 'info' },
        { id: 'preview-quest', label: 'Quest', tone: 'warning' },
        { id: 'preview-leave', label: 'Leave', tone: 'default' },
      ],
      statusMessage: previewStatusMessage ?? defaultStatusMessage,
      activeControlId,
      onControlSelect,
    },
    npcMarkerCount,
    onMarkerActivate,
  };
}
