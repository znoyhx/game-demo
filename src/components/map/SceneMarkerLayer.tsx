import { cn } from '../../core/utils/cn';
import type { AreaSceneMarker } from './areaSceneStage.contract';

interface SceneMarkerLayerProps {
  markers: AreaSceneMarker[];
  onMarkerActivate: (markerId: string) => void;
  filter?: (marker: AreaSceneMarker) => boolean;
  emptyState?: string;
}

export function SceneMarkerLayer({
  markers,
  onMarkerActivate,
  filter,
  emptyState,
}: SceneMarkerLayerProps) {
  const visibleMarkers = filter ? markers.filter(filter) : markers;

  return (
    <div className="area-scene-stage__markers">
      {visibleMarkers.length === 0 && emptyState ? (
        <div className="scene-marker-layer__empty">{emptyState}</div>
      ) : null}
      {visibleMarkers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          className={cn(
            'area-scene-stage__marker',
            `area-scene-stage__marker--${marker.type}`,
            `area-scene-stage__marker--tone-${marker.feedbackTone}`,
            `area-scene-stage__marker--${marker.state}`,
          )}
          style={{
            left: `${marker.xPercent}%`,
            top: `${marker.yPercent}%`,
          }}
          onClick={() => onMarkerActivate(marker.id)}
          disabled={!marker.enabled}
          aria-label={`${marker.typeLabel}: ${marker.label}`}
          title={`${marker.typeLabel}: ${marker.label}`}
        >
          <span className="area-scene-stage__marker-glyph">{marker.glyph}</span>
          <span className="area-scene-stage__marker-caption">
            <strong>{marker.label}</strong>
            <span>{marker.caption}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
