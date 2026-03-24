import type { AreaSceneMarker } from './areaSceneStage.contract';
import { SceneMarkerLayer } from './SceneMarkerLayer';

interface InteractionPointLayerProps {
  markers: AreaSceneMarker[];
  onMarkerActivate: (markerId: string) => void;
}

export function InteractionPointLayer({
  markers,
  onMarkerActivate,
}: InteractionPointLayerProps) {
  return (
    <SceneMarkerLayer
      markers={markers}
      onMarkerActivate={onMarkerActivate}
      emptyState="No interaction points in this area."
    />
  );
}
