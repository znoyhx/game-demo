import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../core/utils/cn';
import type { PixelTone } from './pixelTone';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'solid' | 'ghost';
  tone?: PixelTone;
  isActive?: boolean;
  className?: string;
}

export function PixelButton({
  children,
  className,
  type = 'button',
  variant = 'solid',
  tone = 'default',
  isActive = false,
  ...buttonProps
}: PixelButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={cn(
        'pixel-button',
        variant === 'ghost' && 'pixel-button--ghost',
        tone === 'success' && 'pixel-button--success',
        tone === 'warning' && 'pixel-button--warning',
        tone === 'info' && 'pixel-button--info',
        tone === 'danger' && 'pixel-button--danger',
        isActive && 'pixel-button--active',
        className,
      )}
    >
      {children}
    </button>
  );
}
