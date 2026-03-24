import type { ReactNode } from 'react';

import { cn } from '../../core/utils/cn';
import type { PixelTone } from './pixelTone';
import { PixelLabel } from './PixelLabel';

interface PixelPanelProps {
  title: string;
  eyebrow?: string;
  description?: string;
  footer?: ReactNode;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: PixelTone;
}

export function PixelPanel({
  title,
  eyebrow,
  description,
  footer,
  headerAside,
  children,
  className,
  bodyClassName,
  accent = 'default',
}: PixelPanelProps) {
  return (
    <section
      className={cn(
        'pixel-panel',
        accent === 'success' && 'pixel-panel--success',
        accent === 'warning' && 'pixel-panel--warning',
        accent === 'info' && 'pixel-panel--info',
        accent === 'danger' && 'pixel-panel--danger',
        className,
      )}
    >
      <header className="pixel-panel__header game-panel__header">
        <div className="pixel-panel__heading game-panel__heading">
          {eyebrow ? (
            <PixelLabel className="pixel-panel__eyebrow game-panel__eyebrow" tone="muted">
              {eyebrow}
            </PixelLabel>
          ) : null}
          <div className="pixel-panel__title-row">
            <h3 className="pixel-panel__title game-panel__title">{title}</h3>
            {headerAside ? <div className="pixel-panel__aside">{headerAside}</div> : null}
          </div>
          {description ? (
            <p className="pixel-panel__description game-panel__description">{description}</p>
          ) : null}
        </div>
      </header>
      <div className={cn('pixel-panel__body', bodyClassName)}>{children}</div>
      {footer ? <div className="pixel-panel__footer game-panel__footer">{footer}</div> : null}
    </section>
  );
}
