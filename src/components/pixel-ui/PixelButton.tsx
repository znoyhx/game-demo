import type { ReactNode } from 'react';

import { cn } from '../../core/utils/cn';

interface PixelButtonProps {
  children: ReactNode;
  variant?: 'solid' | 'ghost';
}

export function PixelButton({ children, variant = 'solid' }: PixelButtonProps) {
  return (
    <span className={cn('pixel-button', variant === 'ghost' && 'pixel-button--ghost')}>
      {children}
    </span>
  );
}
