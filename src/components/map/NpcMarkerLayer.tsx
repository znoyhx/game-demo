import type { AreaSceneMarker } from './areaSceneStage.contract';
import { SceneMarkerLayer } from './SceneMarkerLayer';

interface NpcMarkerLayerProps {
  markers: AreaSceneMarker[];
  onMarkerActivate: (markerId: string) => void;
}

export function NpcMarkerLayer({
  markers,
  onMarkerActivate,
}: NpcMarkerLayerProps) {
  return (
    <SceneMarkerLayer
      markers={markers}
      onMarkerActivate={onMarkerActivate}
      filter={(marker) => marker.type === 'npc' || marker.type === 'shop'}
      emptyState="当前区域没有可渲染的角色标记。"
    />
  );
}
