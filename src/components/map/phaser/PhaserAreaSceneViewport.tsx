import { useEffect, useMemo, useRef, useState } from 'react';

import type { AreaSceneStageModel } from '../areaSceneStage.contract';
import { AreaSceneStage } from '../AreaSceneStage';
import type { PixelSceneRenderModel } from './pixelSceneRenderer.contract';
import { buildPixelSceneRenderModelSignature } from './runtime/pixelSceneModelSignature';

interface PromptState {
  title: string;
  detail: string;
}

interface PhaserAreaSceneViewportProps {
  model: PixelSceneRenderModel;
  interactionLocked: boolean;
  fallbackStage: AreaSceneStageModel;
  areaName: string;
  areaType: string;
  onNpcSelect: (npcId: string) => void;
  onMarkerActivate: (markerId: string, source?: 'manual' | 'approach') => void;
  runtimeLoader?: () => Promise<{
    createPhaserPixelSceneRuntime: (options: {
      host: HTMLElement;
      model: PixelSceneRenderModel;
      interactionLocked: boolean;
      callbacks: {
        onNpcSelect: (npcId: string) => void;
        onMarkerActivate: (markerId: string, source?: 'manual' | 'approach') => void;
        onPromptChange: (prompt: PromptState | null) => void;
      };
    }) => Promise<RuntimeHandle>;
  }>;
}

type RuntimeHandle = {
  updateModel: (model: PixelSceneRenderModel) => void;
  updateCallbacks: (callbacks: {
    onNpcSelect: (npcId: string) => void;
    onMarkerActivate: (markerId: string, source?: 'manual' | 'approach') => void;
    onPromptChange: (prompt: PromptState | null) => void;
  }) => void;
  setInteractionLocked: (interactionLocked: boolean) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
};

const defaultRuntimeLoader = () => import('./runtime/createPhaserPixelSceneRuntime');

export function PhaserAreaSceneViewport({
  model,
  interactionLocked,
  fallbackStage,
  areaName,
  areaType,
  onNpcSelect,
  onMarkerActivate,
  runtimeLoader = defaultRuntimeLoader,
}: PhaserAreaSceneViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeHandle | null>(null);
  const runtimeLoaderRef = useRef(runtimeLoader);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const latestModelRef = useRef(model);
  const modelSignature = useMemo(
    () => buildPixelSceneRenderModelSignature(model),
    [model],
  );

  const callbacks = useMemo(
    () => ({
      onNpcSelect,
      onMarkerActivate,
      onPromptChange: setPrompt,
    }),
    [onMarkerActivate, onNpcSelect],
  );
  const latestBootstrapRef = useRef({
    model,
    interactionLocked,
    callbacks,
  });

  useEffect(() => {
    runtimeLoaderRef.current = runtimeLoader;
  }, [runtimeLoader]);

  useEffect(() => {
    latestModelRef.current = model;
  }, [model]);

  useEffect(() => {
    latestBootstrapRef.current = {
      model,
      interactionLocked,
      callbacks,
    };
  }, [callbacks, interactionLocked, model]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let active = true;
    let cleanupResize = () => {};

    const mountRuntime = async () => {
      setLoadState('loading');

      try {
        const module = await runtimeLoaderRef.current();

        if (!active || !hostRef.current) {
          return;
        }

        const runtime = await module.createPhaserPixelSceneRuntime({
          host: hostRef.current,
          model: latestBootstrapRef.current.model,
          interactionLocked: latestBootstrapRef.current.interactionLocked,
          callbacks: latestBootstrapRef.current.callbacks,
        });

        if (!active) {
          runtime.destroy();
          return;
        }

        runtimeRef.current = runtime;
        setLoadState('ready');

        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) {
              return;
            }
            runtime.resize(entry.contentRect.width, entry.contentRect.height);
          });
          observer.observe(hostRef.current);
          cleanupResize = () => observer.disconnect();
        } else {
          const handleResize = () => {
            if (!hostRef.current) {
              return;
            }
            runtime.resize(hostRef.current.clientWidth, hostRef.current.clientHeight);
          };

          window.addEventListener('resize', handleResize);
          cleanupResize = () => window.removeEventListener('resize', handleResize);
        }
      } catch {
        if (active) {
          setLoadState('error');
        }
      }
    };

    void mountRuntime();

    return () => {
      active = false;
      cleanupResize();
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
    };
  }, [model.areaId]);

  useEffect(() => {
    runtimeRef.current?.updateCallbacks(callbacks);
  }, [callbacks]);

  useEffect(() => {
    runtimeRef.current?.setInteractionLocked(interactionLocked);
  }, [interactionLocked]);

  useEffect(() => {
    runtimeRef.current?.updateModel(latestModelRef.current);
  }, [modelSignature]);

  return (
    <div
      className="phaser-scene"
      data-renderer="phaser"
      data-area-id={model.areaId}
      data-scene-state={loadState}
    >
      <div className="phaser-scene__toolbar">
        <span>像素场景已启用</span>
        <span>{model.prompts.moveHint}</span>
        <span>{model.prompts.interactHint}</span>
      </div>

      <div ref={hostRef} className="phaser-scene__host" aria-label={`${areaName} 像素场景`}>
        {loadState !== 'ready' ? (
          <div className="phaser-scene__loading">
            {loadState === 'error' ? '像素场景加载失败，已切回备用视图。' : '像素场景载入中…'}
          </div>
        ) : null}
      </div>

      <div className="phaser-scene__overlay">
        <div className="phaser-scene__overlay-card">
          <strong>{prompt?.title ?? areaName}</strong>
          <span>
            {interactionLocked
              ? model.prompts.lockedHint
              : prompt?.detail ?? `${areaType} · ${model.summary.interactionCount} 个场景交互点`}
          </span>
        </div>
      </div>

      {loadState === 'error' ? (
        <div className="phaser-scene__fallback">
          <AreaSceneStage
            areaName={areaName}
            areaType={areaType}
            model={fallbackStage}
            onMarkerActivate={(markerId) => onMarkerActivate(markerId, 'manual')}
          />
        </div>
      ) : null}
    </div>
  );
}
