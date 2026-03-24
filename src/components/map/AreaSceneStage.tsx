import { AreaSceneMap } from './AreaSceneMap';
import { InteractionPointLayer } from './InteractionPointLayer';
import type { AreaSceneStageModel } from './areaSceneStage.contract';

interface AreaSceneStageProps {
  areaName: string;
  areaType: string;
  model: AreaSceneStageModel;
  onMarkerActivate: (markerId: string) => void;
}

export function AreaSceneStage({
  areaName,
  areaType,
  model,
  onMarkerActivate,
}: AreaSceneStageProps) {
  return (
    <AreaSceneMap areaName={areaName} areaType={areaType} model={model}>
      <InteractionPointLayer
        markers={model.markers}
        onMarkerActivate={onMarkerActivate}
      />
    </AreaSceneMap>
  );
}
