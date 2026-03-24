import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../core/utils/cn';
import type { PixelTone } from './pixelTone';

export interface PixelBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: PixelTone;
  emphasis?: 'soft' | 'solid';
  pulse?: boolean;
  icon?: ReactNode;
}

export function PixelBadge({
  children,
  className,
  tone = 'default',
  emphasis = 'soft',
  pulse = false,
  icon,
  ...badgeProps
}: PixelBadgeProps) {
  return (
    <span
      {...badgeProps}
      className={cn(
        'badge',
        'pixel-badge',
        tone === 'success' && 'badge--success',
        tone === 'warning' && 'badge--warning',
        tone === 'info' && 'badge--info',
        tone === 'danger' && 'badge--danger',
        tone === 'success' && 'pixel-badge--success',
        tone === 'warning' && 'pixel-badge--warning',
        tone === 'info' && 'pixel-badge--info',
        tone === 'danger' && 'pixel-badge--danger',
        emphasis === 'solid' && 'pixel-badge--solid',
        pulse && 'pixel-badge--pulse',
        className,
      )}
    >
      {icon ? <span className="pixel-badge__icon">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
