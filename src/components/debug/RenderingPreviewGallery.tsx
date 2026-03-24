import { SectionCard } from '../layout/SectionCard';
import { AreaSceneMap } from '../map/AreaSceneMap';
import { InteractionPointLayer } from '../map/InteractionPointLayer';
import { NpcMarkerLayer } from '../map/NpcMarkerLayer';
import { DialoguePanel } from '../game/DialoguePanel';
import { QuestTrackerPanel } from '../quest/QuestTrackerPanel';
import type { RenderingPreviewViewModel } from '../../pages/Debug/renderingPreviewViewModel';

interface RenderingPreviewGalleryProps {
  preview: RenderingPreviewViewModel;
  onPreviewAreaSelect: (areaId: string) => void;
  onOpenForcedScene: (areaId: string | null) => void;
  onClearForcedScene: () => void;
}

export function RenderingPreviewGallery({
  preview,
  onPreviewAreaSelect,
  onOpenForcedScene,
  onClearForcedScene,
}: RenderingPreviewGalleryProps) {
  return (
    <section className="render-preview-lab">
      <SectionCard
        title={preview.copy.title}
        eyebrow={preview.copy.eyebrow}
        description={preview.copy.description}
        footer={preview.copy.footer}
      >
        <div className="render-preview-lab__toolbar">
          {preview.areaOptions.map((area) => (
            <button
              key={area.id}
              type="button"
              className={[
                'pixel-button',
                area.isSelected ? '' : 'pixel-button--ghost',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onPreviewAreaSelect(area.id)}
            >
              {area.name}
            </button>
          ))}
        </div>
        <div className="render-preview-lab__actions">
          <button
            type="button"
            className="pixel-button"
            onClick={() => onOpenForcedScene(preview.selectedAreaId)}
            disabled={!preview.selectedAreaId}
          >
            {preview.copy.openSceneAction}
          </button>
          <button
            type="button"
            className="pixel-button pixel-button--ghost"
            onClick={onClearForcedScene}
            disabled={!preview.forcedAreaId}
          >
            {preview.copy.clearForcedAction}
          </button>
        </div>
      </SectionCard>

      <div className="render-preview-lab__status-row">
        {preview.forcedAreaName ? (
          <span className="pixel-badge pixel-badge--warning">
            {preview.copy.forcedBadge(preview.forcedAreaName)}
          </span>
        ) : (
          <span className="pixel-badge">{preview.copy.liveBadge}</span>
        )}
        <span className="pixel-badge pixel-badge--info">
          {preview.copy.previewing(preview.scene.areaName)}
        </span>
      </div>

      <div className="render-preview-lab__grid">
        <SectionCard
          title={preview.copy.mapAreaTitle}
          eyebrow="Map Area"
          description={preview.scene.description}
          footer={preview.scene.sceneStatus}
        >
          <AreaSceneMap
            areaName={preview.scene.areaName}
            areaType={preview.scene.areaType}
            model={preview.scene.stage}
          />
        </SectionCard>

        <SectionCard
          title={preview.copy.npcLayerTitle}
          eyebrow="NPC Marker Layer"
          description={preview.copy.npcLayerDescription}
          footer={preview.copy.npcLayerFooter(preview.npcMarkerCount)}
        >
          <AreaSceneMap
            areaName={preview.scene.areaName}
            areaType={preview.scene.areaType}
            model={preview.scene.stage}
            showMeta={false}
            showLegend={false}
          >
            <NpcMarkerLayer
              markers={preview.scene.stage.markers}
              onMarkerActivate={preview.onMarkerActivate}
            />
          </AreaSceneMap>
        </SectionCard>

        <SectionCard
          title={preview.copy.interactionLayerTitle}
          eyebrow="Interaction Points"
          description={preview.copy.interactionLayerDescription}
          footer={preview.copy.interactionLayerFooter(
            preview.scene.stage.markers.length,
          )}
        >
          <AreaSceneMap
            areaName={preview.scene.areaName}
            areaType={preview.scene.areaType}
            model={preview.scene.stage}
            showMeta={false}
            showLegend={false}
          >
            <InteractionPointLayer
              markers={preview.scene.stage.markers}
              onMarkerActivate={preview.onMarkerActivate}
            />
          </AreaSceneMap>
        </SectionCard>

        <DialoguePanel
          {...preview.dialogue}
          className="render-preview-lab__panel"
        />

        <QuestTrackerPanel
          quests={preview.quests}
          className="render-preview-lab__panel"
        />
      </div>
    </section>
  );
}
