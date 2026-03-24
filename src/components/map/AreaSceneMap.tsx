import type { ReactNode } from 'react';

import { cn } from '../../core/utils/cn';
import { PixelBadge } from '../pixel-ui/PixelBadge';
import { PixelLabel } from '../pixel-ui/PixelLabel';
import type { AreaSceneStageModel } from './areaSceneStage.contract';

interface AreaSceneMapProps {
  areaName: string;
  areaType: string;
  model: AreaSceneStageModel;
  children?: ReactNode;
  className?: string;
  showMeta?: boolean;
  showLegend?: boolean;
  showSpotlight?: boolean;
}

export function AreaSceneMap({
  areaName,
  areaType,
  model,
  children,
  className,
  showMeta = true,
  showLegend = true,
  showSpotlight = true,
}: AreaSceneMapProps) {
  return (
    <div className={cn('area-scene-stage', className)}>
      {showMeta ? (
        <div className="area-scene-stage__topline">
          <div className="area-scene-stage__meta">
            <PixelLabel tone="accent">{model.rendererLabel}</PixelLabel>
            <span className="area-scene-stage__meta-copy">
              {areaName} · {areaType} · {model.backgroundLabel}
            </span>
          </div>
          <div className="area-scene-stage__targets">
            {model.engineTargets.map((target) => (
              <PixelBadge key={target} tone="info">
                {target}
              </PixelBadge>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'area-scene-stage__viewport',
          model.stageTone === 'warning' && 'area-scene-stage__viewport--warning',
          model.stageTone === 'danger' && 'area-scene-stage__viewport--danger',
          model.stageTone === 'success' && 'area-scene-stage__viewport--success',
          model.stageTone === 'info' && 'area-scene-stage__viewport--info',
        )}
        aria-label={`${areaName} 场景占位视窗`}
      >
        {model.layers.map((layer) => (
          <div
            key={layer.id}
            className={cn(
              'area-scene-stage__layer',
              `area-scene-stage__layer--${layer.kind}`,
            )}
            data-layer-kind={layer.kind}
            aria-label={`${layer.label}: ${layer.detail}`}
          >
            {layer.tiles.map((tile) => (
              <span
                key={tile.id}
                className={cn(
                  'area-scene-stage__tile',
                  `area-scene-stage__tile--${tile.variant}`,
                  `area-scene-stage__tile--tone-${tile.tone}`,
                  tile.animation !== 'none' &&
                    `area-scene-stage__tile--anim-${tile.animation}`,
                )}
                style={{
                  left: `${tile.xPercent}%`,
                  top: `${tile.yPercent}%`,
                  width: `${tile.widthPercent}%`,
                  height: `${tile.heightPercent}%`,
                }}
                title={tile.label}
              />
            ))}
          </div>
        ))}

        <div className="area-scene-stage__scanlines" aria-hidden="true" />
        <div className="area-scene-stage__frame" aria-hidden="true" />
        {showSpotlight ? (
          <div className="area-scene-stage__spotlight">
            <PixelBadge
              tone={model.stageTone}
              emphasis="solid"
              pulse={model.stageTone === 'warning' || model.stageTone === 'danger'}
            >
              {model.highlightSummary}
            </PixelBadge>
          </div>
        ) : null}
        {children}
      </div>

      {showLegend ? (
        <div className="area-scene-stage__legend">
          {model.legend.map((entry) => (
            <PixelBadge key={entry.id} tone={entry.tone}>
              {entry.label}
            </PixelBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
