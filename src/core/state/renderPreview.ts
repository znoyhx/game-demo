import type { MapState } from '../schemas';

const uniqueIds = (ids: string[]) => Array.from(new Set(ids));

export function buildForcedRenderMapState(
  mapState: MapState,
  areaId: string | null,
): MapState {
  if (!areaId) {
    return mapState;
  }

  return {
    ...mapState,
    currentAreaId: areaId,
    discoveredAreaIds: uniqueIds([...mapState.discoveredAreaIds, areaId]),
    unlockedAreaIds: uniqueIds([...mapState.unlockedAreaIds, areaId]),
    visitHistory:
      mapState.visitHistory[mapState.visitHistory.length - 1] === areaId
        ? mapState.visitHistory
        : [...mapState.visitHistory, areaId],
  };
}
