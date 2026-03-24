import type { ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';

interface BadgeProps {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'danger';
}

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return <PixelBadge tone={tone}>{children}</PixelBadge>;
}
