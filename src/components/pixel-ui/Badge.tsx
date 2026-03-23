import type { ReactNode } from 'react';

import { cn } from '../../core/utils/cn';

interface BadgeProps {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'info';
}

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        tone === 'success' && 'badge--success',
        tone === 'warning' && 'badge--warning',
        tone === 'info' && 'badge--info',
      )}
    >
      {children}
    </span>
  );
}
