import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../core/utils/cn';
import type { PixelLabelTone } from './pixelTone';

interface PixelLabelProps extends HTMLAttributes<HTMLElement> {
  as?: 'span' | 'p' | 'strong' | 'div';
  children: ReactNode;
  tone?: PixelLabelTone;
  size?: 'sm' | 'md';
}

export function PixelLabel({
  as: Tag = 'span',
  children,
  className,
  tone = 'default',
  size = 'sm',
  ...labelProps
}: PixelLabelProps) {
  return (
    <Tag
      {...labelProps}
      className={cn(
        'pixel-label',
        tone === 'muted' && 'pixel-label--muted',
        tone === 'accent' && 'pixel-label--accent',
        tone === 'success' && 'pixel-label--success',
        tone === 'warning' && 'pixel-label--warning',
        tone === 'info' && 'pixel-label--info',
        tone === 'danger' && 'pixel-label--danger',
        size === 'md' && 'pixel-label--md',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
