import type { ReactNode } from 'react';

import { PixelPanel } from '../pixel-ui/PixelPanel';

interface GamePanelProps {
  title: string;
  eyebrow?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function GamePanel({
  title,
  eyebrow,
  description,
  footer,
  children,
  className,
}: GamePanelProps) {
  return (
    <PixelPanel
      title={title}
      eyebrow={eyebrow}
      description={description}
      footer={footer}
      className={className ? `game-panel ${className}` : 'game-panel'}
      bodyClassName="game-panel__body"
    >
      {children}
    </PixelPanel>
  );
}
